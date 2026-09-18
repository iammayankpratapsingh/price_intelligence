import { amountInWords } from './amountInWords.js';

const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/**
 * A stored bill keeps one tax figure per line; the printed invoice needs it
 * split the way the bill was raised, plus the per-rate summary. Both are
 * derived here rather than stored, so a reprint always agrees with the totals
 * that were saved.
 */
export function hydrateInvoice(inv) {
  const interstate = Boolean(inv.interstate);

  const lines = (inv.lines || []).map((l) => ({
    ...l,
    cgst: interstate ? 0 : r2(l.taxAmount / 2),
    sgst: interstate ? 0 : r2(l.taxAmount / 2),
    igst: interstate ? l.taxAmount : 0,
  }));

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
    ...inv,
    lines,
    taxSummary: [...byRate.values()].sort((a, b) => a.taxRate - b.taxRate),
    words: amountInWords(inv.total),
  };
}
