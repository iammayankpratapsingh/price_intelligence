/**
 * One-time ingest: parses the workbook and loads it into Neon.
 *
 * Run locally, never on the server — parsing peaks around 511 MB RSS, which is
 * over a 512 MB free instance. Once seeded, the API only ever queries Postgres.
 *
 *   npm run seed          # create schema + load, skips if already seeded
 *   npm run seed -- --reset   # wipe and reload
 */
import fs from 'node:fs';
import path from 'node:path';
import { readWorkbook } from '../src/lib/excel.js';
import { REVISIONS, REVISION_SOURCES, decorate } from '../src/lib/dataset.js';
import { pool, query, applySchema, closePool } from '../src/lib/db.js';
import { SOURCE_WORKBOOK } from '../src/config.js';

const RESET = process.argv.includes('--reset');
const BATCH = 2_000;

async function main() {
  console.log('[seed] applying schema…');
  await applySchema();

  const existing = await query('select count(*)::int as n from parts');
  if (existing.rows[0].n > 0 && !RESET) {
    console.log(`[seed] ${existing.rows[0].n} parts already loaded. Use --reset to reload.`);
    return;
  }

  if (RESET) {
    console.log('[seed] resetting tables…');
    await query('truncate part_prices, parts, revisions restart identity cascade');
  }

  if (!fs.existsSync(SOURCE_WORKBOOK)) {
    throw new Error(`Workbook not found at ${SOURCE_WORKBOOK}`);
  }

  const started = Date.now();
  const { rows } = readWorkbook(SOURCE_WORKBOOK);
  console.log(`[seed] parsed ${rows.length} parts from ${path.basename(SOURCE_WORKBOOK)} in ${Date.now() - started} ms`);

  const client = await pool.connect();
  try {
    await client.query('begin');

    // Revisions first — the three lists the workbook holds, in order.
    const parts = rows.map(decorate);
    const revisionIds = [];
    for (let i = 0; i < REVISIONS.length; i++) {
      const priced = parts.filter((p) => p.hist[i] != null).length;
      let up = 0, down = 0, nw = 0;
      for (const p of parts) {
        const cur = p.hist[i];
        const prev = i ? p.hist[i - 1] : null;
        if (cur == null) continue;
        if (i === 0 || prev == null) nw++;
        else if (cur > prev) up++;
        else if (cur < prev) down++;
      }
      const { rows: r } = await client.query(
        `insert into revisions (seq, name, source, kind, parts, up, down, new_parts)
         values ($1, $2, $3, 'base', $4, $5, $6, $7) returning id`,
        [i + 1, REVISIONS[i], REVISION_SOURCES[i], priced, up, down, nw],
      );
      revisionIds.push(r[0].id);
    }
    console.log(`[seed] inserted ${revisionIds.length} base revisions`);

    // Parts, batched via UNNEST — one round trip per 2,000 rows.
    const partIds = new Map();
    for (let i = 0; i < rows.length; i += BATCH) {
      const slice = rows.slice(i, i + BATCH);
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
      for (const p of out) partIds.set(p.part_no, p.id);
      process.stdout.write(`\r[seed] parts ${Math.min(i + BATCH, rows.length)}/${rows.length}`);
    }
    process.stdout.write('\n');

    // Prices — only where the part is actually priced, so absent stays absent
    // rather than becoming a row with a NULL that means the same thing.
    const flat = [];
    for (const row of rows) {
      const pid = partIds.get(row.partNo);
      row.hist.forEach((price, i) => {
        if (price != null) flat.push([pid, revisionIds[i], price]);
      });
    }
    for (let i = 0; i < flat.length; i += BATCH) {
      const slice = flat.slice(i, i + BATCH);
      await client.query(
        `insert into part_prices (part_id, revision_id, price)
         select * from unnest($1::int[], $2::int[], $3::numeric[])
         on conflict (part_id, revision_id) do update set price = excluded.price`,
        [slice.map((r) => r[0]), slice.map((r) => r[1]), slice.map((r) => r[2])],
      );
      process.stdout.write(`\r[seed] prices ${Math.min(i + BATCH, flat.length)}/${flat.length}`);
    }
    process.stdout.write('\n');

    await client.query('commit');
    console.log(`[seed] done in ${((Date.now() - started) / 1000).toFixed(1)}s — ${rows.length} parts, ${flat.length} prices`);
  } catch (err) {
    await client.query('rollback');
    throw err;
  } finally {
    client.release();
  }
}

main()
  .catch((err) => {
    console.error('[seed] failed:', err.message);
    process.exitCode = 1;
  })
  .finally(closePool);
