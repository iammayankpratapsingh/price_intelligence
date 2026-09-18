# Parts Price Intelligence

A React + Express implementation of the Parts Price Intelligence canvas. Every
number on screen is read from the real workbook in `data/mrp solution.xlsx`
— 66,828 parts across three price revisions — served from Neon Postgres.

## Running it

Two terminals, from this folder.

**1. API** (serves the data from Neon Postgres)

```bash
cd backend
npm install
cp .env.example .env    # add your DATABASE_URL
npm run seed            # one time: workbook -> Neon
npm start               # http://localhost:4000
```

The catalog lives in Neon. `npm run seed` parses the workbook once and loads
66,828 parts and 134,916 prices; the API then loads them from Postgres at boot
(~1.7 s) and serves every read from memory as before.

Seeding is deliberately a **local** step. Parsing the workbook peaks at ~511 MB
RSS, which does not fit a 512 MB free instance; booting from Postgres peaks at
~189 MB, which does. Add `--reset` to reload: `npm run seed -- --reset`.

**2. Frontend**

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

Vite proxies `/api` to port 4000, so both run on one origin in the browser.

## Signing in

```
pricedemo@gmail.com
price@demo
```

Credentials live in the `users` table in Neon. Only a **bcrypt hash** is
stored, never the password, so the row is safe to read without exposing the
credential. Login issues a 12-hour JWT, unchanged in shape.

Add or change a user:

```bash
npm run user:create                                   # the demo account above
npm run user:create -- someone@example.com 's3cret' "Their Name" "Their role"
```

Re-running it for an existing email updates that user rather than failing.

## Screens

| Route | What it shows |
| --- | --- |
| `/login` | Sign-in, with the vector car artwork |
| — | On success a car drives across the screen trailing exhaust smoke, then the catalog opens |
| `/dashboard` | KPI tiles, change mix, biggest movers, recent revisions |
| `/search` | Full catalog search over all 66,828 parts, status filters |
| `/part/:partNo` | One part: price history step chart and per-revision table |
| `/upload` | Drag-and-drop a new price list, compared against the current one |
| `/analytics` | Catalog price index, change by category, most volatile parts |
| `/history` | Every revision on record |

## Database

Neon Postgres (`ap-southeast-1`). Three tables, in `backend/sql/schema.sql`:

| Table | Holds |
| --- | --- |
| `parts` | One row per part number — root, description, HS code, tax |
| `revisions` | Each price list, `kind` `base` (from the workbook) or `upload` |
| `part_prices` | `(part_id, revision_id) -> price`; **NULL means not priced**, never 0 |

A part absent from a revision has no `part_prices` row, so a missing price can
never be read as a price cut. Search uses a `pg_trgm` GIN index, matching the
substring semantics of the previous in-memory filter.

## How the workbook is read

`mrp solution.xlsx` has two sheets, which together give three revisions:

- **`old`** — `OLD MRP` (revision 1) and `NEW MRP` (revision 2). This sheet has
  *two* columns named `NEW MRP`; the first is an Excel lookup that is often
  `#N/A`, so the parser takes the second, which holds the real revised price.
- **`new mrp`** — `MRP`, the 09 Aug 2026 list (revision 3).

Merging on `PART_NUM` gives 66,828 parts, each with a three-point history. A part
is `up` / `down` / `same` when priced in both the latest and previous revision,
`new` when priced only in the latest, and `dropped` when it fell out of it.
`#N/A` and blank cells become `null`, never `0`, so a missing price never counts
as a price cut.

Column detection is alias-based (`backend/src/lib/excel.js`), so an uploaded file
whose headers read `PART NO` or `HSN` instead of `PART_NUM` / `HS_CODE` still
parses.

## API

All routes except `/api/health` and `/api/auth/*` need `Authorization: Bearer <token>`.

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Exchange credentials for a token |
| `GET` | `/api/auth/me` | Current user |
| `GET` | `/api/dashboard` | Counts, net change, movers, revisions |
| `GET` | `/api/parts` | Search / filter / sort (`q`, `filter`, `sortKey`, `sortDir`, `limit`, `offset`) |
| `GET` | `/api/parts/:partNo` | One part with full history |
| `GET` | `/api/compare` | Headline comparison and top movers |
| `GET` | `/api/analytics` | Price index, category movement, volatility |
| `GET` | `/api/history` | Revision log |
| `POST` | `/api/upload` | Upload a price list and diff it (multipart `file`) |

An upload is **published as the new current revision**: its prices are stored,
the revision it was compared against becomes the previous, and every up/down
figure is measured between those two.

Only the newest `REVISION_LIMIT` revisions are kept (default **4**); older ones
are pruned as new lists arrive. Raise it — or set `REVISION_LIMIT=0` to keep
everything — in `backend/src/config.js` or the environment. Nothing else needs
to change: the schema and every aggregate are already revision-count agnostic.

## Notes

- **Responsive throughout.** Below 900px the sidebar becomes a drawer and the
  data tables render as stacked cards rather than scrolling sideways.
- **Light and dark**, following the system preference, toggleable in the header
  and on the login page. The choice persists.
- **The sign-in transition** is pure vector and CSS — no video or GIF. The token
  is stored the moment credentials check out, but the session is only published
  once the car has driven off screen (`authenticate` vs. `commitSession` in
  `lib/auth.jsx`), which is what keeps `/login` from redirecting mid-animation.
  Anyone with "reduce motion" set gets a short fade instead.
- **Uploaded revisions persist.** They are written to the `revisions` table in
  Neon and survive a restart. Uploaded files themselves are deleted once diffed,
  since nothing reads them again and host filesystems are ephemeral.
- `JWT_SECRET` must be set when `NODE_ENV=production`; the API refuses to start
  on the dev key.
