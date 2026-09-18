import { buildCatalog } from './dataset.js';
import { loadRows, loadRevisions, commitRevision, deleteRevision } from './db.js';

/**
 * Holds the active catalog in memory, loaded from Neon Postgres at boot.
 *
 * Postgres is the source of truth; this is a read-through cache. Every read
 * route still serves from RAM — swapping the workbook parse for a query is
 * what makes the boot fit in a 512 MB instance, and it is what finally makes
 * the uploaded-revision log survive a restart.
 *
 * Seeding the database from the workbook is a separate, local step:
 *   npm run seed
 */

let catalog = null;
let revisionLog = [];

/** Loads the catalog from Postgres. Must be awaited before the server listens. */
export async function loadCatalog({ force = false } = {}) {
  if (catalog && !force) return catalog;

  const started = Date.now();
  const rows = await loadRows();
  revisionLog = await loadRevisions();

  // An empty database is a valid starting state: the API serves an empty
  // catalog and the first uploaded price list becomes revision 1.
  if (!rows.length) {
    console.log('[store] database is empty — upload a price list to begin');
  }

  const base = revisionLog;

  catalog = buildCatalog({
    rows,
    sheetNames: [],
    source: base[0]?.source || 'neon',
    uploadedAt: base.at(-1)?.uploadedAt?.toISOString?.() ?? new Date().toISOString(),
  });

  // Revision names and sources are whatever the database holds — however many
  // there are — so uploading or renaming a list needs no code change.
  catalog.revisions = base.map((r) => r.name);
  catalog.revisionSources = base.map((r) => r.source);

  console.log(`[store] loaded ${rows.length} parts from Neon in ${Date.now() - started} ms`);
  return catalog;
}

export function getCatalog() {
  if (!catalog) throw new Error('Catalog is still loading.');
  return catalog;
}

export function getRevisionLog() {
  return revisionLog;
}

/**
 * Commits an uploaded price list as the new current revision and rebuilds the
 * in-memory catalog from the database, so the next request sees the new prices
 * — with the previous revision now serving as the comparison baseline.
 */
export async function publishRevision(payload) {
  const result = await commitRevision(payload);
  await loadCatalog({ force: true });
  return { ...result, revision: revisionLog.at(-1) };
}

/**
 * Publishes a set of revisions in order — one per price column an uploaded
 * file carries — then rebuilds the catalog once, rather than after each.
 */
export async function publishRevisions(list) {
  let pruned = 0;
  const created = [];
  for (const payload of list) {
    const result = await commitRevision(payload);
    pruned += result.pruned;
    created.push({ seq: result.seq, name: payload.name });
  }
  await loadCatalog({ force: true });
  return { created, pruned, revision: revisionLog.at(-1) };
}

/**
 * Undoes the most recent upload and rebuilds the catalog, so prices go back to
 * what they were before it. A revision pruned by that upload is already gone
 * and does not come back.
 */
export async function removeRevision(seq) {
  const removed = await deleteRevision(seq);
  await loadCatalog({ force: true });
  return removed;
}
