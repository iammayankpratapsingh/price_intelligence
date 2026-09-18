import path from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const ROOT = path.resolve(__dirname, '..');
export const PROJECT_ROOT = path.resolve(ROOT, '..');

export const PORT = Number(process.env.PORT || 4000);

/** Neon Postgres. Required — the catalog is served from the database. */
export const DATABASE_URL = process.env.DATABASE_URL || '';

/**
 * How many price revisions to keep. The newest REVISION_LIMIT are retained and
 * older ones are pruned when a new list is uploaded. Raise it (or set it to 0
 * for "keep everything") once you want the full history — nothing else needs
 * to change; the schema and the aggregates are already revision-count agnostic.
 */
export const REVISION_LIMIT = Number(process.env.REVISION_LIMIT ?? 4);
export const DATA_DIR = path.join(ROOT, '.cache');
export const CACHE_FILE = path.join(DATA_DIR, 'catalog.json');
export const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(ROOT, 'uploads');

/** The shipped workbook lives in the project's data folder. */
export const SOURCE_WORKBOOK =
  process.env.SOURCE_WORKBOOK || path.join(PROJECT_ROOT, 'data', 'mrp solution.xlsx');

const IS_PROD = process.env.NODE_ENV === 'production';

if (IS_PROD && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in production — refusing to start with the dev key.');
}

export const JWT_SECRET = process.env.JWT_SECRET || 'parts-price-intelligence-dev-secret';
export const TOKEN_TTL = '12h';

