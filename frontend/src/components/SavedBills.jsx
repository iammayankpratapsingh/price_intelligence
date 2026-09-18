import { useMemo, useState } from 'react';
import Card from './Card.jsx';
import Icon from './Icon.jsx';
import { ErrorState, Loading } from './States.jsx';
import { useApi } from '../lib/useApi.js';
import { api } from '../lib/api.js';
import { hydrateInvoice } from '../lib/hydrateInvoice.js';
import { fmt, fmtInt } from '../lib/format.js';

const TH = {
  textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 600,
  letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--muted)',
  borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
};
const TD = { padding: '11px 14px', borderBottom: '1px solid var(--border)' };

const when = (iso) =>
  new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

/**
 * The purchase record: every saved bill, newest first. Opening one loads it
 * back from the database so it can be read and reprinted exactly as issued.
 */
export default function SavedBills({ isMobile, open, onOpen, refreshKey }) {
  const { data, loading, error, refetch } = useApi(`/invoices?limit=200&k=${refreshKey}`);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState('');

  const rows = useMemo(() => {
    const list = data?.invoices || [];
    const term = q.trim().toLowerCase();
    if (!term) return list;
    return list.filter(
      (i) => i.number.toLowerCase().includes(term) || (i.customer || '').toLowerCase().includes(term),
    );
  }, [data, q]);

  const totalBilled = useMemo(() => rows.reduce((a, i) => a + i.total, 0), [rows]);

  const load = async (number) => {
    setBusy(number);
    try {
      onOpen(hydrateInvoice(await api(`/invoices/${number}`)));
    } catch {
      onOpen(null);
    } finally {
      setBusy('');
    }
  };

  if (loading) return <Loading label="Loading saved bills…" />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  if (open) {
    return (
      <>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => onOpen(null)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7, height: 36, padding: '0 14px',
              borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)',
              color: 'var(--text)', fontWeight: 600, fontSize: 13, cursor: 'pointer',
            }}
          >
            <Icon name="back" size={15} strokeWidth={2} /> All bills
          </button>
          <span style={{ flex: 1 }} />
          <button
            type="button"
            onClick={() => window.print()}
            style={{
              height: 36, padding: '0 16px', borderRadius: 8, border: 'none',
              background: 'var(--red)', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer',
            }}
          >
            Print / PDF
          </button>
        </div>

        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div className="num" style={{ fontSize: 18, fontWeight: 700 }}>{open.number}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{when(open.createdAt)}</div>
            </div>
            <div style={{ textAlign: isMobile ? 'left' : 'right' }}>
              <div style={{ fontWeight: 600 }}>{open.customer || 'Walk-in customer'}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                {open.customerGstin ? `GSTIN ${open.customerGstin}` : 'No GSTIN'}
                {open.placeOfSupply ? ` · ${open.placeOfSupply}` : ''}
              </div>
            </div>
          </div>
        </Card>

        <Card padding={0} style={{ overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['#', 'Part', 'HSN', 'Qty', 'Rate', 'Taxable', 'GST%', 'Amount'].map((h, i) => (
                    <th key={h} style={{ ...TH, textAlign: i >= 3 ? 'right' : 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {open.lines.map((l) => (
                  <tr key={l.lineNo}>
                    <td className="num" style={{ ...TD, color: 'var(--muted)' }}>{l.lineNo}</td>
                    <td style={TD}>
                      <div className="mono" style={{ fontWeight: 600 }}>{l.partNo}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{l.desc}</div>
                    </td>
                    <td className="num" style={{ ...TD, color: 'var(--muted)' }}>{l.hs || '—'}</td>
                    <td className="num" style={{ ...TD, textAlign: 'right' }}>{l.qty}</td>
                    <td className="num" style={{ ...TD, textAlign: 'right' }}>{fmt(l.rate)}</td>
                    <td className="num" style={{ ...TD, textAlign: 'right' }}>{fmt(l.taxable)}</td>
                    <td className="num" style={{ ...TD, textAlign: 'right' }}>{l.taxRate}%</td>
                    <td className="num" style={{ ...TD, textAlign: 'right', fontWeight: 600 }}>{fmt(l.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card style={{ maxWidth: 380, marginLeft: isMobile ? 0 : 'auto' }}>
          {[
            ['Taxable value', open.taxable],
            ...(open.interstate ? [['IGST', open.igst]] : [['CGST', open.cgst], ['SGST', open.sgst]]),
            ['Round off', open.roundOff],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13, padding: '4px 0' }}>
              <span style={{ color: 'var(--muted)' }}>{k}</span>
              <span className="num">{fmt(v)}</span>
            </div>
          ))}
          <div style={{ height: 1, background: 'var(--border)', margin: '10px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
            <span style={{ fontWeight: 600 }}>Grand total</span>
            <span className="num" style={{ fontSize: 20, fontWeight: 700 }}>{fmt(open.total)}</span>
          </div>
        </Card>
      </>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220, maxWidth: 380 }}>
          <Icon name="search" size={16} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--faint)', pointerEvents: 'none' }} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Find a bill by number or customer"
            style={{
              width: '100%', height: 38, padding: '0 12px 0 36px', borderRadius: 8,
              border: '1px solid var(--border)', background: 'var(--surface)',
              color: 'var(--text)', fontSize: 13, outline: 'none',
            }}
          />
        </div>
        <span style={{ flex: 1 }} />
        <span className="num" style={{ fontSize: 12, color: 'var(--muted)' }}>
          {fmtInt(rows.length)} bills · {fmt(totalBilled)} billed
        </span>
      </div>

      {rows.length === 0 ? (
        <Card>
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)' }}>
            <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
              {q ? 'No bill matches that' : 'No bills saved yet'}
            </div>
            {q ? 'Try the bill number or the customer name.' : 'Save a bill and it will appear here.'}
          </div>
        </Card>
      ) : (
        <Card padding={0} style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={TH}>Bill no.</th>
                  <th style={TH}>Date</th>
                  <th style={TH}>Customer</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Items</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Total</th>
                  <th style={{ ...TH, width: 90 }} />
                </tr>
              </thead>
              <tbody>
                {rows.map((i, k) => (
                  <tr
                    key={i.number}
                    style={{ background: k % 2 ? 'var(--zebra)' : 'transparent', cursor: 'pointer' }}
                    onClick={() => load(i.number)}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface2)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = k % 2 ? 'var(--zebra)' : 'transparent'; }}
                  >
                    <td className="mono" style={{ ...TD, fontWeight: 600 }}>{i.number}</td>
                    <td style={{ ...TD, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{when(i.createdAt)}</td>
                    <td style={TD}>{i.customer || <span style={{ color: 'var(--muted)' }}>Walk-in customer</span>}</td>
                    <td className="num" style={{ ...TD, textAlign: 'right' }}>{i.items}</td>
                    <td className="num" style={{ ...TD, textAlign: 'right', fontWeight: 600 }}>{fmt(i.total)}</td>
                    <td style={{ ...TD, textAlign: 'right' }}>
                      <span style={{ color: 'var(--red)', fontWeight: 500, fontSize: 12 }}>
                        {busy === i.number ? 'Opening…' : 'View →'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
