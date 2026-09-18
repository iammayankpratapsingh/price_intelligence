/**
 * Empties the catalog so a price list can be uploaded from scratch.
 * Users are deliberately left alone — signing in must still work afterwards.
 *
 *   npm run clear
 */
import { applySchema, query, closePool } from '../src/lib/db.js';

applySchema()
  .then(() => query('truncate part_prices, parts, revisions restart identity cascade'))
  .then(async () => {
    const { rows } = await query(
      `select (select count(*) from parts)::int parts,
              (select count(*) from part_prices)::int prices,
              (select count(*) from revisions)::int revisions,
              (select count(*) from users)::int users`,
    );
    console.log('[clear] catalog emptied:', rows[0]);
  })
  .catch((err) => {
    console.error('[clear] failed:', err.message);
    process.exitCode = 1;
  })
  .finally(closePool);
