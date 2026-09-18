import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useOutletContext } from 'react-router-dom';
import Card, { PageHeader } from '../components/Card.jsx';
import Icon from '../components/Icon.jsx';
import { api } from '../lib/api.js';
import { useDebounced } from '../lib/useApi.js';
import { fmt } from '../lib/format.js';
import { amountInWords } from '../lib/amountInWords.js';
import InvoiceSheet from '../components/InvoiceSheet.jsx';
import SavedBills from '../components/SavedBills.jsx';

const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/** Same arithmetic as the server, so totals update without a round trip. */
function compute(items, { interstate, priceIncludesTax }) {
  const lines = items.map((it, i) => {
    const gross = r2(it.qty * it.rate);
    const taxable = priceIncludesTax ? r2(gross / (1 + it.taxRate / 100)) : gross;
    const taxAmount = r2(priceIncludesTax ? gross - taxable : (gross * it.taxRate) / 100);
    return {
      ...it,
      lineNo: i + 1,
      taxable,
      taxAmount,
      cgst: interstate ? 0 : r2(taxAmount / 2),
      sgst: interstate ? 0 : r2(taxAmount / 2),
      igst: interstate ? taxAmount : 0,
      amount: r2(taxable + taxAmount),
    };
  });
  const sum = (k) => r2(lines.reduce((a, l) => a + l[k], 0));
  const taxable = sum('taxable');
  const cgst = sum('cgst');
  const sgst = sum('sgst');
  const igst = sum('igst');
  const before = r2(taxable + cgst + sgst + igst);
  const total = Math.round(before);

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
    lines, taxable, cgst, sgst, igst,
    roundOff: r2(total - before),
    total,
    taxSummary: [...byRate.values()].sort((a, b) => a.taxRate - b.taxRate),
  };
}

const field = {
  width: '100%', height: 36, padding: '0 10px', borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--surface)',
  color: 'var(--text)', fontSize: 13, outline: 'none',
};
const label = { fontSize: 12, color: 'var(--muted)', marginBottom: 4, display: 'block' };

/** Type-ahead that adds a catalog part as a bill line. */
function PartPicker({ onAdd }) {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const debounced = useDebounced(q, 250);
  const box = useRef(null);

  useEffect(() => {
    if (!debounced.trim()) { setRows([]); return undefined; }
    let live = true;
    api(`/parts?q=${encodeURIComponent(debounced)}&filter=all&limit=8&excludeDropped=1`)
      .then((d) => { if (live) { setRows(d.rows || []); setOpen(true); } })
      .catch(() => { if (live) setRows([]); });
    return () => { live = false; };
  }, [debounced]);

  useEffect(() => {
    const away = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, []);

  const pick = (r) => { onAdd(r); setQ(''); setRows([]); setOpen(false); };

  return (
    <div ref={box} style={{ position: 'relative' }}>
      <Icon
        name="search" size={16}
        style={{ position: 'absolute', left: 12, top: 11, color: 'var(--faint)', pointerEvents: 'none' }}
      />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => rows.length && setOpen(true)}
        onKeyDown={(e) => { if (e.key === 'Enter' && rows[0]) pick(rows[0]); }}
        placeholder="Add a part — type a part number or description"
        style={{ ...field, height: 40, paddingLeft: 36 }}
      />
      {open && rows.length > 0 && (
        <div
          style={{
            position: 'absolute', top: 44, left: 0, right: 0, zIndex: 20, maxHeight: 280,
            overflow: 'auto', background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,.18)',
          }}
        >
          {rows.map((r) => (
            <button
              key={r.partNo}
              type="button"
              onClick={() => pick(r)}
              style={{
                display: 'flex', width: '100%', gap: 12, alignItems: 'center', textAlign: 'left',
                padding: '9px 12px', border: 'none', borderBottom: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 13,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <span className="mono" style={{ fontWeight: 600, flex: 'none' }}>{r.partNo}</span>
              <span style={{ color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                {r.desc}
              </span>
              <span className="num" style={{ fontWeight: 600, flex: 'none' }}>{fmt(r.cur ?? r.prev)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Billing() {
  const { isMobile } = useOutletContext();
  const [items, setItems] = useState([]);
  const [interstate, setInterstate] = useState(false);
  const [priceIncludesTax, setPriceIncludesTax] = useState(true);
  const [customer, setCustomer] = useState('');
  const [customerGstin, setCustomerGstin] = useState('');
  const [customerAddr, setCustomerAddr] = useState('');
  const [placeOfSupply, setPlaceOfSupply] = useState('');
  const [saved, setSaved] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('new');
  const [openBill, setOpenBill] = useState(null);
  // Bumped after a save so the records list refetches rather than showing a
  // stale copy that is missing the bill just raised.
  const [billsKey, setBillsKey] = useState(0);

  const totals = useMemo(
    () => compute(items, { interstate, priceIncludesTax }),
    [items, interstate, priceIncludesTax],
  );

  /** Adding a part already on the bill bumps its quantity instead of repeating it. */
  const addPart = (p) => {
    const price = p.cur ?? p.prev ?? 0;
    setSaved(null);
    setItems((list) => {
      const at = list.findIndex((l) => l.partNo === p.partNo);
      if (at >= 0) {
        const next = [...list];
        next[at] = { ...next[at], qty: r2(next[at].qty + 1) };
        return next;
      }
      return [...list, {
        partNo: p.partNo,
        desc: p.desc || '',
        hs: p.hs || '',
        qty: 1,
        rate: price,
        taxRate: p.tax ?? 18,
      }];
    });
  };

  const patch = (i, changes) => {
    setSaved(null);
    setItems((list) => list.map((l, k) => (k === i ? { ...l, ...changes } : l)));
  };
  const removeAt = (i) => { setSaved(null); setItems((list) => list.filter((_, k) => k !== i)); };
  const clearAll = () => { setItems([]); setSaved(null); setError(''); };

  const save = async () => {
    if (!items.length || saving) return;
    setSaving(true);
    setError('');
    try {
      const inv = await api('/invoices', {
        method: 'POST',
        body: { items, interstate, priceIncludesTax, customer, customerGstin, customerAddr, placeOfSupply },
      });
      setSaved(inv);
      setBillsKey((k) => k + 1);
    } catch (err) {
      setError(err.message || 'Could not save this bill.');
    } finally {
      setSaving(false);
    }
  };

  // Printing always uses saved data when present, so a printed bill carries a
  // real invoice number rather than a draft that was never recorded. When a
  // past bill is open in the records tab, that is what prints instead.
  const draft = {
    number: saved?.number || 'DRAFT',
    createdAt: saved?.createdAt || new Date().toISOString(),
    customer, customerGstin, customerAddr, placeOfSupply,
    interstate, priceIncludesTax,
    ...totals,
    words: amountInWords(totals.total),
  };
  const printable = tab === 'saved' && openBill ? openBill : draft;

  const btn = (bg, color) => ({
    height: 38, padding: '0 16px', borderRadius: 8, border: bg === 'transparent' ? '1px solid var(--border)' : 'none',
    background: bg, color, fontWeight: 600, fontSize: 13, cursor: 'pointer',
  });

  return (
    <>
      <div className="no-print" style={{ padding: isMobile ? 16 : 32, maxWidth: 1240, margin: '0 auto' }}>
        <PageHeader
          title="Billing"
          subtitle="Add parts, set quantities, and print a GST bill."
          action={
            tab === 'new' && items.length ? (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" onClick={clearAll} style={btn('transparent', 'var(--text)')}>Clear</button>
                <button type="button" onClick={save} disabled={saving} style={btn('var(--nav)', '#fff')}>
                  {saving ? 'Saving…' : saved ? 'Saved' : 'Save bill'}
                </button>
                <button type="button" onClick={() => window.print()} style={btn('var(--red)', '#fff')}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                    <Icon name="file" size={15} strokeWidth={2} /> Print / PDF
                  </span>
                </button>
              </div>
            ) : null
          }
        />

        <div style={{ display: 'flex', gap: 6, marginBottom: 18, borderBottom: '1px solid var(--border)' }}>
          {[['new', 'New bill'], ['saved', 'Saved bills']].map(([key, text]) => (
            <button
              key={key}
              type="button"
              onClick={() => { setTab(key); setOpenBill(null); }}
              style={{
                padding: '9px 14px', border: 'none', background: 'none', cursor: 'pointer',
                fontSize: 14, fontWeight: 600,
                color: tab === key ? 'var(--text)' : 'var(--muted)',
                borderBottom: `2px solid ${tab === key ? 'var(--red)' : 'transparent'}`,
                marginBottom: -1,
              }}
            >
              {text}
            </button>
          ))}
        </div>

        {tab === 'saved' ? (
          <SavedBills isMobile={isMobile} open={openBill} onOpen={setOpenBill} refreshKey={billsKey} />
        ) : (
        <>
        {error && (
          <div role="alert" style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--red-bg)', color: 'var(--red)', fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}
        {saved && (
          <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--green-bg)', color: 'var(--green)', fontSize: 13, marginBottom: 16, fontWeight: 500 }}>
            Saved as {saved.number} — use Print / PDF to hand it to the customer. It is now in Saved bills.
          </div>
        )}

        <Card style={{ marginBottom: 16 }}>
          <PartPicker onAdd={addPart} />
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
            Adding a part that is already on the bill increases its quantity.
          </div>
        </Card>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0,5fr) minmax(300px,2fr)', gap: 16 }}>
          <Card padding={0} style={{ overflow: 'hidden' }}>
            {items.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
                <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>No items yet</div>
                Search for a part above to start the bill.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr>
                      {['#', 'Part / description', 'HSN', 'Qty', 'Rate', 'GST%', 'Amount', ''].map((h, i) => (
                        <th
                          key={h + i}
                          style={{
                            textAlign: i >= 3 && i <= 6 ? 'right' : 'left', padding: '10px 12px',
                            fontSize: 11, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase',
                            color: 'var(--muted)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {totals.lines.map((l, i) => (
                      <tr key={l.partNo} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td className="num" style={{ padding: '8px 12px', color: 'var(--muted)' }}>{l.lineNo}</td>
                        <td style={{ padding: '8px 12px', minWidth: 200 }}>
                          <div className="mono" style={{ fontWeight: 600 }}>{l.partNo}</div>
                          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{l.desc}</div>
                        </td>
                        <td className="num" style={{ padding: '8px 12px', color: 'var(--muted)' }}>{l.hs || '—'}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <button
                              type="button" aria-label="Reduce quantity"
                              onClick={() => patch(i, { qty: Math.max(1, r2(l.qty - 1)) })}
                              style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer', fontSize: 15, lineHeight: 1 }}
                            >
                              −
                            </button>
                            <input
                              value={l.qty}
                              onChange={(e) => {
                                const v = Number(e.target.value);
                                patch(i, { qty: Number.isFinite(v) && v > 0 ? v : 1 });
                              }}
                              inputMode="decimal"
                              style={{ ...field, width: 56, height: 26, textAlign: 'center', padding: '0 4px' }}
                            />
                            <button
                              type="button" aria-label="Increase quantity"
                              onClick={() => patch(i, { qty: r2(l.qty + 1) })}
                              style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer', fontSize: 15, lineHeight: 1 }}
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                          <input
                            value={l.rate}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              patch(i, { rate: Number.isFinite(v) && v >= 0 ? v : 0 });
                            }}
                            inputMode="decimal"
                            style={{ ...field, width: 96, height: 26, textAlign: 'right' }}
                          />
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                          <input
                            value={l.taxRate}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              patch(i, { taxRate: Number.isFinite(v) && v >= 0 ? v : 0 });
                            }}
                            inputMode="decimal"
                            style={{ ...field, width: 60, height: 26, textAlign: 'right' }}
                          />
                        </td>
                        <td className="num" style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {fmt(l.amount)}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                          <button
                            type="button" aria-label={`Remove ${l.partNo}`}
                            onClick={() => removeAt(i)}
                            style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--red)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
                          >
                            <Icon name="trash" size={14} strokeWidth={1.9} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
            <Card>
              <h2 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 600 }}>Customer</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <span style={label}>Name</span>
                  <input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Customer name" style={field} />
                </div>
                <div>
                  <span style={label}>GSTIN (optional)</span>
                  <input value={customerGstin} onChange={(e) => setCustomerGstin(e.target.value.toUpperCase())} placeholder="22AAAAA0000A1Z5" style={field} />
                </div>
                <div>
                  <span style={label}>Address</span>
                  <input value={customerAddr} onChange={(e) => setCustomerAddr(e.target.value)} placeholder="Address" style={field} />
                </div>
                <div>
                  <span style={label}>Place of supply</span>
                  <input value={placeOfSupply} onChange={(e) => setPlaceOfSupply(e.target.value)} placeholder="State" style={field} />
                </div>
              </div>
            </Card>

            <Card>
              <h2 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 600 }}>Tax</h2>
              <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, cursor: 'pointer', marginBottom: 10 }}>
                <input type="checkbox" checked={priceIncludesTax} onChange={(e) => setPriceIncludesTax(e.target.checked)} style={{ accentColor: 'var(--red)', marginTop: 2 }} />
                <span>
                  Price includes GST
                  <span style={{ display: 'block', color: 'var(--muted)', fontSize: 12 }}>
                    MRP normally includes tax, so tax is taken out of the rate rather than added on top.
                  </span>
                </span>
              </label>
              <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={interstate} onChange={(e) => setInterstate(e.target.checked)} style={{ accentColor: 'var(--red)', marginTop: 2 }} />
                <span>
                  Inter-state (IGST)
                  <span style={{ display: 'block', color: 'var(--muted)', fontSize: 12 }}>
                    Otherwise the tax is split into CGST and SGST.
                  </span>
                </span>
              </label>
            </Card>

            <Card>
              <h2 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 600 }}>Total</h2>
              {[
                ['Taxable value', totals.taxable],
                ...(interstate
                  ? [['IGST', totals.igst]]
                  : [['CGST', totals.cgst], ['SGST', totals.sgst]]),
                ['Round off', totals.roundOff],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13, padding: '5px 0' }}>
                  <span style={{ color: 'var(--muted)' }}>{k}</span>
                  <span className="num">{fmt(v)}</span>
                </div>
              ))}
              <div style={{ height: 1, background: 'var(--border)', margin: '10px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
                <span style={{ fontWeight: 600 }}>Grand total</span>
                <span className="num" style={{ fontSize: 22, fontWeight: 700 }}>{fmt(totals.total)}</span>
              </div>
              {items.length > 0 && (
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8, lineHeight: 1.5 }}>
                  {amountInWords(totals.total)}
                </div>
              )}
            </Card>
          </div>
        </div>
        </>
        )}
      </div>

      {/*
        Rendered into <body>, not into the page.

        The app's <main> is position:relative, so an absolutely positioned
        print sheet inside it would anchor to <main> — which starts after the
        sidebar — and print off-centre to the right. Portalling to <body>
        anchors it to the page itself.
      */}
      {createPortal(
        <div className="print-only">
          <InvoiceSheet invoice={printable} />
        </div>,
        document.body,
      )}
    </>
  );
}
