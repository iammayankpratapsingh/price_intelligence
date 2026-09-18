import { pool, query } from './db.js';

/**
 * Invoice arithmetic and storage.
 *
 * MRP in an Indian price list is inclusive of GST by law, so by default the
 * billed rate is treated as tax-inclusive: the taxable value is backed out of
 * it rather than tax being added on top. `priceIncludesTax: false` switches to
 * adding tax on top, for a list quoted ex-tax.
 *
 * Intra-state supply splits the tax into CGST + SGST (half each); inter-state
 * charges IGST at the full rate.
 */

const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export function computeInvoice({ items = [], interstate = false, priceIncludesTax = true }) {
  const lines = items.map((it, i) => {
    const qty = Number(it.qty) || 0;
    const rate = Number(it.rate) || 0;
    const taxRate = Number(it.taxRate) || 0;
    const gross = r2(qty * rate);

    const taxable = priceIncludesTax ? r2(gross / (1 + taxRate / 100)) : gross;
    const taxAmount = r2(priceIncludesTax ? gross - taxable : (gross * taxRate) / 100);

    return {
      lineNo: i + 1,
      partNo: it.partNo,
      desc: it.desc || '',
      hs: it.hs || '',
      qty,
      rate,
      taxRate,
      taxable,
      taxAmount,
      // Half each for intra-state, so the invoice can print CGST and SGST.
      cgst: interstate ? 0 : r2(taxAmount / 2),
      sgst: interstate ? 0 : r2(taxAmount / 2),
      igst: interstate ? taxAmount : 0,
      amount: r2(taxable + taxAmount),
    };
  });

  const sum = (key) => r2(lines.reduce((a, l) => a + l[key], 0));
  const taxable = sum('taxable');
  const cgst = sum('cgst');
  const sgst = sum('sgst');
  const igst = sum('igst');
  const beforeRounding = r2(taxable + cgst + sgst + igst);
  const total = Math.round(beforeRounding);
  const roundOff = r2(total - beforeRounding);

  // Tax broken down by rate — every GST invoice needs this summary.
  const byRate = new Map();
  for (const l of lines) {
    const g = byRate.get(l.taxRate) || { taxRate: l.taxRate, taxable: 0, cgst: 0, sgst: 0, igst: 0 };
    g.taxable = r2(g.taxable + l.taxable);
    g.cgst = r2(g.cgst + l.cgst);
    g.sgst = r2(g.sgst + l.sgst);
    g.igst = r2(g.igst + l.igst);
    byRate.set(l.taxRate, g);
  }

  return {
    lines,
    taxable,
    cgst,
    sgst,
    igst,
    roundOff,
    total,
    taxSummary: [...byRate.values()].sort((a, b) => a.taxRate - b.taxRate),
    qtyTotal: r2(lines.reduce((a, l) => a + l.qty, 0)),
  };
}

/** INV-2026-0001, restarting each calendar year. */
async function nextNumber(client) {
  const year = new Date().getFullYear();
  const { rows } = await client.query(
    `select coalesce(max(substring(number from '[0-9]+$')::int), 0) + 1 as n
       from invoices where number like $1`,
    [`INV-${year}-%`],
  );
  return `INV-${year}-${String(rows[0].n).padStart(4, '0')}`;
}

export async function createInvoice(input) {
  const totals = computeInvoice(input);
  if (!totals.lines.length) {
    const err = new Error('Add at least one item before saving the bill.');
    err.status = 400;
    throw err;
  }

  const client = await pool.connect();
  try {
    await client.query('begin');
    const number = await nextNumber(client);

    const { rows } = await client.query(
      `insert into invoices
         (number, customer, customer_gstin, customer_addr, place_of_supply,
          interstate, price_includes_tax, taxable, cgst, sgst, igst, round_off, total, created_by)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       returning id, number, created_at as "createdAt"`,
      [
        number,
        input.customer || '',
        input.customerGstin || '',
        input.customerAddr || '',
        input.placeOfSupply || '',
        Boolean(input.interstate),
        input.priceIncludesTax !== false,
        totals.taxable, totals.cgst, totals.sgst, totals.igst,
        totals.roundOff, totals.total,
        input.createdBy || '',
      ],
    );
    const invoice = rows[0];

    for (const l of totals.lines) {
      await client.query(
        `insert into invoice_items
           (invoice_id, line_no, part_no, descr, hs_code, qty, rate, tax_rate, taxable, tax_amount, amount)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [invoice.id, l.lineNo, l.partNo, l.desc, l.hs, l.qty, l.rate, l.taxRate, l.taxable, l.taxAmount, l.amount],
      );
    }

    await client.query('commit');
    return { ...invoice, ...totals, ...input };
  } catch (err) {
    await client.query('rollback');
    throw err;
  } finally {
    client.release();
  }
}

export async function getInvoice(number) {
  const { rows } = await query(
    `select id, number, customer, customer_gstin as "customerGstin", customer_addr as "customerAddr",
            place_of_supply as "placeOfSupply", interstate, price_includes_tax as "priceIncludesTax",
            taxable::float8, cgst::float8, sgst::float8, igst::float8,
            round_off::float8 as "roundOff", total::float8, created_by as "createdBy",
            created_at as "createdAt"
       from invoices where number = $1`,
    [number],
  );
  if (!rows[0]) return null;
  const { rows: items } = await query(
    `select line_no as "lineNo", part_no as "partNo", descr as "desc", hs_code as hs,
            qty::float8, rate::float8, tax_rate::float8 as "taxRate",
            taxable::float8, tax_amount::float8 as "taxAmount", amount::float8
       from invoice_items where invoice_id = $1 order by line_no`,
    [rows[0].id],
  );
  return { ...rows[0], lines: items };
}

export async function listInvoices(limit = 50) {
  const { rows } = await query(
    `select number, customer, total::float8, created_at as "createdAt",
            (select count(*) from invoice_items i where i.invoice_id = invoices.id)::int as items
       from invoices order by created_at desc limit $1`,
    [limit],
  );
  return rows;
}
