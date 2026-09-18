-- Parts Price Intelligence — Neon Postgres schema
--
-- Shape mirrors the domain: a part is priced once per revision. NULL price
-- means "absent from that list" and must never be read as 0 — the same rule
-- the workbook parser enforces for #N/A and blank cells.

create table if not exists parts (
  id       integer generated always as identity primary key,
  part_no  text not null unique,
  root     text not null default '',
  descr    text not null default '',
  hs_code  text not null default '',
  tax      double precision
);

create table if not exists revisions (
  id          integer generated always as identity primary key,
  seq         integer not null unique,          -- chronological order
  name        text    not null,
  source      text    not null default '',
  kind        text    not null default 'base',  -- 'base' = from the workbook, 'upload' = diffed upload
  parts       integer not null default 0,
  up          integer not null default 0,
  down        integer not null default 0,
  new_parts   integer not null default 0,
  uploaded_at timestamptz not null default now()
);

create table if not exists part_prices (
  part_id     integer not null references parts(id) on delete cascade,
  revision_id integer not null references revisions(id) on delete cascade,
  price       numeric(14,4),                    -- NULL = not priced in this revision
  primary key (part_id, revision_id)
);

create index if not exists part_prices_revision_idx on part_prices (revision_id);

-- Substring search over part number / description / root, matching the
-- semantics of the previous in-memory `.includes(term)` filter.
create extension if not exists pg_trgm;
create index if not exists parts_search_idx on parts
  using gin ((part_no || ' ' || descr || ' ' || root) gin_trgm_ops);

-- Application users. Passwords are stored as bcrypt hashes, never in plain
-- text, so the column is safe to read without exposing the credential.
create table if not exists users (
  id            integer generated always as identity primary key,
  email         text not null unique,
  password_hash text not null,
  name          text not null default '',
  role          text not null default '',
  initials      text not null default '',
  created_at    timestamptz not null default now()
);

-- Invoices. Line amounts are stored as calculated at the time of billing, not
-- recomputed from the catalog later: a bill must still show what was charged
-- even after the price list changes.
create table if not exists invoices (
  id            integer generated always as identity primary key,
  number        text not null unique,
  customer      text not null default '',
  customer_gstin text not null default '',
  customer_addr text not null default '',
  place_of_supply text not null default '',
  -- Intra-state bills split tax into CGST + SGST; inter-state charge IGST.
  interstate    boolean not null default false,
  price_includes_tax boolean not null default true,
  taxable       numeric(14,2) not null default 0,
  cgst          numeric(14,2) not null default 0,
  sgst          numeric(14,2) not null default 0,
  igst          numeric(14,2) not null default 0,
  round_off     numeric(14,2) not null default 0,
  total         numeric(14,2) not null default 0,
  created_by    text not null default '',
  created_at    timestamptz not null default now()
);

create table if not exists invoice_items (
  id          integer generated always as identity primary key,
  invoice_id  integer not null references invoices(id) on delete cascade,
  line_no     integer not null,
  part_no     text not null,
  descr       text not null default '',
  hs_code     text not null default '',
  qty         numeric(12,3) not null,
  rate        numeric(14,2) not null,   -- unit price as billed
  tax_rate    numeric(5,2) not null default 0,
  taxable     numeric(14,2) not null,
  tax_amount  numeric(14,2) not null,
  amount      numeric(14,2) not null    -- taxable + tax
);

create index if not exists invoice_items_invoice_idx on invoice_items (invoice_id);
create index if not exists invoices_created_idx on invoices (created_at desc);
