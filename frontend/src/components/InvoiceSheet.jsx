import { fmt } from '../lib/format.js';

/**
 * The bill as it prints: a tax invoice laid out for A4.
 *
 * Deliberately plain HTML and inline styles — this is what goes to a printer
 * or a PDF, so it must not depend on the app's theme, which is overridden to
 * black-on-white by the print stylesheet.
 */

/** Change these to your own workshop's details. */
export const SELLER = {
  name: 'PartsIndex Auto Services',
  addr: 'Service Road, Industrial Area, Pune, Maharashtra 411001',
  gstin: '27AAAAA0000A1Z5',
  phone: '+91 00000 00000',
  email: 'billing@partsindex.example',
};

const cell = { border: '1px solid #000', padding: '4px 6px', verticalAlign: 'top' };
const head = { ...cell, fontWeight: 700, background: '#eee', fontSize: 10, textTransform: 'uppercase' };
const right = { textAlign: 'right', whiteSpace: 'nowrap' };

export default function InvoiceSheet({ invoice }) {
  const {
    number, createdAt, customer, customerGstin, customerAddr, placeOfSupply,
    interstate, lines = [], taxable, cgst, sgst, igst, roundOff, total, taxSummary = [], words,
  } = invoice;

  const date = new Date(createdAt).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  return (
    <div className="invoice-sheet" style={{ fontFamily: 'Arial, Helvetica, sans-serif', color: '#000', fontSize: 11 }}>
      <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 13, marginBottom: 6 }}>TAX INVOICE</div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
        <tbody>
          <tr>
            <td style={{ ...cell, width: '55%' }}>
              <div style={{ fontWeight: 700, fontSize: 12 }}>{SELLER.name}</div>
              <div>{SELLER.addr}</div>
              <div>GSTIN: {SELLER.gstin}</div>
              <div>{SELLER.phone} · {SELLER.email}</div>
            </td>
            <td style={cell}>
              <div><strong>Invoice no:</strong> {number}</div>
              <div><strong>Date:</strong> {date}</div>
              <div><strong>Place of supply:</strong> {placeOfSupply || '—'}</div>
              <div><strong>Supply type:</strong> {interstate ? 'Inter-state (IGST)' : 'Intra-state (CGST + SGST)'}</div>
            </td>
          </tr>
          <tr>
            <td style={cell} colSpan={2}>
              <strong>Bill to:</strong> {customer || '—'}
              {customerAddr ? ` · ${customerAddr}` : ''}
              {customerGstin ? ` · GSTIN: ${customerGstin}` : ''}
            </td>
          </tr>
        </tbody>
      </table>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ ...head, width: 26 }}>#</th>
            <th style={head}>Part no.</th>
            <th style={head}>Description</th>
            <th style={{ ...head, width: 60 }}>HSN</th>
            <th style={{ ...head, ...right, width: 44 }}>Qty</th>
            <th style={{ ...head, ...right, width: 70 }}>Rate</th>
            <th style={{ ...head, ...right, width: 74 }}>Taxable</th>
            <th style={{ ...head, ...right, width: 42 }}>GST%</th>
            {interstate ? (
              <th style={{ ...head, ...right, width: 70 }}>IGST</th>
            ) : (
              <>
                <th style={{ ...head, ...right, width: 64 }}>CGST</th>
                <th style={{ ...head, ...right, width: 64 }}>SGST</th>
              </>
            )}
            <th style={{ ...head, ...right, width: 80 }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => (
            <tr key={l.lineNo}>
              <td style={cell}>{l.lineNo}</td>
              <td style={cell}>{l.partNo}</td>
              <td style={cell}>{l.desc}</td>
              <td style={cell}>{l.hs || '—'}</td>
              <td style={{ ...cell, ...right }}>{l.qty}</td>
              <td style={{ ...cell, ...right }}>{fmt(l.rate)}</td>
              <td style={{ ...cell, ...right }}>{fmt(l.taxable)}</td>
              <td style={{ ...cell, ...right }}>{l.taxRate}%</td>
              {interstate ? (
                <td style={{ ...cell, ...right }}>{fmt(l.igst)}</td>
              ) : (
                <>
                  <td style={{ ...cell, ...right }}>{fmt(l.cgst)}</td>
                  <td style={{ ...cell, ...right }}>{fmt(l.sgst)}</td>
                </>
              )}
              <td style={{ ...cell, ...right, fontWeight: 700 }}>{fmt(l.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
        <tbody>
          <tr>
            <td style={{ ...cell, width: '58%' }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Tax summary</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={head}>Rate</th>
                    <th style={{ ...head, ...right }}>Taxable</th>
                    {interstate
                      ? <th style={{ ...head, ...right }}>IGST</th>
                      : <><th style={{ ...head, ...right }}>CGST</th><th style={{ ...head, ...right }}>SGST</th></>}
                  </tr>
                </thead>
                <tbody>
                  {taxSummary.map((g) => (
                    <tr key={g.taxRate}>
                      <td style={cell}>{g.taxRate}%</td>
                      <td style={{ ...cell, ...right }}>{fmt(g.taxable)}</td>
                      {interstate
                        ? <td style={{ ...cell, ...right }}>{fmt(g.igst)}</td>
                        : <><td style={{ ...cell, ...right }}>{fmt(g.cgst)}</td><td style={{ ...cell, ...right }}>{fmt(g.sgst)}</td></>}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: 6 }}>
                <strong>Amount in words:</strong> {words}
              </div>
            </td>
            <td style={cell}>
              {[
                ['Taxable value', taxable],
                ...(interstate ? [['IGST', igst]] : [['CGST', cgst], ['SGST', sgst]]),
                ['Round off', roundOff],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '2px 0' }}>
                  <span>{k}</span><span>{fmt(v)}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, borderTop: '1px solid #000', marginTop: 4, paddingTop: 4, fontWeight: 700, fontSize: 13 }}>
                <span>Grand total</span><span>{fmt(total)}</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
        <tbody>
          <tr>
            <td style={{ ...cell, width: '60%', fontSize: 10 }}>
              <div style={{ fontWeight: 700, marginBottom: 3 }}>Declaration</div>
              We declare that this invoice shows the actual price of the goods described
              and that all particulars are true and correct.
            </td>
            <td style={{ ...cell, textAlign: 'center' }}>
              <div style={{ fontWeight: 700 }}>For {SELLER.name}</div>
              <div style={{ height: 40 }} />
              <div>Authorised signatory</div>
            </td>
          </tr>
        </tbody>
      </table>

      <div style={{ textAlign: 'center', fontSize: 9, marginTop: 6 }}>
        This is a computer-generated invoice.
      </div>
    </div>
  );
}
