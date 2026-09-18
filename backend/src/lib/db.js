import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DATABASE_URL, REVISION_LIMIT } from '../config.js';

/**
 * Neon Postgres access. The catalog is still served from memory — Postgres is
 * the durable source it is loaded from at boot, replacing the workbook parse
 * (~511 MB peak RSS) with a query (~215 MB), which is what lets the API run
 * inside a 512 MB instance.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is not set. Copy backend/.env.example to backend/.env.');
}

export const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  // Neon's free tier scales to zero; a small pool avoids holding it awake and
  // stays well inside the connection cap.
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 15_000,
});

pool.on('error', (err) => console.error('[db] idle client error:', err.message));

export const query = (text, params) => pool.query(text, params);

export async function applySchema() {
  const sql = fs.readFileSync(path.join(__dirname, '..', '..', 'sql', 'schema.sql'), 'utf8');
  await pool.query(sql);
}

/**
 * Reads every part with its price at each retained revision, oldest first.
 * One `hist` slot per revision, null where the part was not priced in it.
 */
export async function loadRows() {
  const { rows } = await query(`
    with base as (select id, seq from revisions)
    select p.part_no                                as "partNo",
           p.root,
           p.descr                                  as "desc",
           p.hs_code                                as hs,
           p.tax,
           array_agg(pp.price::float8 order by b.seq) as hist
      from parts p
      cross join base b
      left join part_prices pp
        on pp.part_id = p.id and pp.revision_id = b.id
     group by p.id
     order by p.id
  `);
  return rows;
}

/** The revision log, newest revision last — the shape the history screen reads. */
export async function loadRevisions() {
  const { rows } = await query(`
    select seq, name, source, kind, parts, up, down,
           new_parts as "new", uploaded_at as "uploadedAt"
      from revisions
     order by seq
  `);
  return rows.map((r, i) => ({ ...r, rev: `r${r.seq}`, index: i }));
}

/**
 * Commits an uploaded price list as the new current revision: its prices are
 * stored, any part seen for the first time is created, and the oldest
 * revisions beyond REVISION_LIMIT are pruned. All in one transaction, so a
 * failure part-way leaves the previous revision intact.
 */
export async function commitRevision({ name, source, counts, rows }) {
  const client = await pool.connect();
  try {
    await client.query('begin');

    const { rows: rev } = await client.query(
      `insert into revisions (seq, name, source, kind, parts, up, down, new_parts, uploaded_at)
       values ((select coalesce(max(seq), 0) + 1 from revisions), $1, $2, 'upload', $3, $4, $5, $6, now())
       returning id, seq`,
      [name, source, rows.length, counts.up, counts.down, counts.new],
    );
    const revisionId = rev[0].id;

    const BATCH = 2_000;
    for (let i = 0; i < rows.length; i += BATCH) {
      const slice = rows.slice(i, i + BATCH);
      // Parts already known keep their details; genuinely new part numbers are
      // created here so the upload's prices have something to hang off.
      const { rows: out } = await client.query(
        `insert into parts (part_no, root, descr, hs_code, tax)
         select * from unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::float8[])
         on conflict (part_no) do update set root = excluded.root
         returning id, part_no`,
        [
          slice.map((r) => r.partNo),
          slice.map((r) => r.root || ''),
          slice.map((r) => r.desc || ''),
          slice.map((r) => r.hs || ''),
          slice.map((r) => r.tax ?? null),
        ],
      );
      const byNo = new Map(out.map((p) => [p.part_no, p.id]));
      await client.query(
        `insert into part_prices (part_id, revision_id, price)
         select * from unnest($1::int[], $2::int[], $3::numeric[])
         on conflict (part_id, revision_id) do update set price = excluded.price`,
        [
          slice.map((r) => byNo.get(r.partNo)),
          slice.map(() => revisionId),
          slice.map((r) => r.price),
        ],
      );
    }

    // Keep only the newest REVISION_LIMIT revisions; part_prices cascades.
    let pruned = 0;
    if (REVISION_LIMIT > 0) {
      const { rowCount } = await client.query(
        `delete from revisions
          where id not in (select id from revisions order by seq desc limit $1)`,
        [REVISION_LIMIT],
      );
      pruned = rowCount;
    }

    await client.query('commit');
    return { seq: rev[0].seq, pruned };
  } catch (err) {
    await client.query('rollback');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Removes an uploaded revision. Only the newest may go, and only if it was an
 * upload: deleting one from the middle would retroactively change what every
 * part is compared against, and the base revisions are the foundation the
 * whole catalog rests on. part_prices cascades.
 */
export async function deleteRevision(seq) {
  const { rows } = await query(
    `select seq, kind, name,
            (select max(seq) from revisions) as newest,
            (select count(*) from revisions) as remaining
       from revisions where seq = $1`,
    [seq],
  );
  const rev = rows[0];
  if (!rev) {
    const err = new Error('That revision no longer exists.');
    err.status = 404;
    throw err;
  }
  if (rev.kind !== 'upload') {
    const err = new Error('Only an uploaded price list can be removed.');
    err.status = 400;
    throw err;
  }
  if (Number(rev.seq) !== Number(rev.newest)) {
    const err = new Error('Only the most recent upload can be removed.');
    err.status = 400;
    throw err;
  }
  if (Number(rev.remaining) <= 1) {
    const err = new Error('This is the only revision left — it cannot be removed.');
    err.status = 400;
    throw err;
  }
  await query('delete from revisions where seq = $1', [seq]);
  return { seq: Number(rev.seq), name: rev.name };
}

export const closePool = () => pool.end();
