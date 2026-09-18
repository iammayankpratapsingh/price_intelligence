import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import Card from '../components/Card.jsx';
import Icon from '../components/Icon.jsx';
import { ErrorState, Loading } from '../components/States.jsx';
import { useApi } from '../lib/useApi.js';
import { deleteRevision } from '../lib/api.js';
import { fmtInt } from '../lib/format.js';

const TH = {
  textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600,
  letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--muted)',
  borderBottom: '1px solid var(--border)',
};
const TD = { padding: '11px 16px', borderBottom: '1px solid var(--border)' };

/**
 * A revision is stored as "<file> · <column>" with a source of "<file> · <sheets>",
 * so the file name would otherwise be printed three times in one row. Split it
 * into a short label and one muted line of provenance.
 */
function describe(u) {
  const file = (u.source || '').split(' · ')[0] || u.name;
  const sheets = (u.source || '').split(' · ').slice(1).join(' · ');
  const label = u.name.startsWith(`${file} · `) ? u.name.slice(file.length + 3) : u.name;
  const when = u.uploadedAt
    ? new Date(u.uploadedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '';
  return {
    label,
    detail: [file, sheets && `sheet ${sheets}`, when].filter(Boolean).join(' · '),
  };
}

/** Marks which revision the catalog is currently priced from. */
function CurrentPill() {
  return (
    <span
      style={{
        marginLeft: 8, padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 600,
        letterSpacing: '.03em', textTransform: 'uppercase',
        background: 'var(--green-bg)', color: 'var(--green)', whiteSpace: 'nowrap',
      }}
    >
      Current
    </span>
  );
}

export default function History() {
  const { isMobile } = useOutletContext();
  const { data, loading, error, refetch } = useApi('/history');
  const [confirming, setConfirming] = useState(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState('');

  if (loading) return <Loading label="Loading revision history…" />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const all = data?.revisions || [];
  const rows = [...all].reverse();

  // Only the newest upload can be undone. Removing one from the middle would
  // change what every earlier price is compared against, and the base
  // revisions from the workbook are what the catalog rests on.
  const newest = all.at(-1);
  const undoable = newest && newest.kind === 'upload' && all.length > 1 ? newest.seq : null;

  const remove = async (seq) => {
    setRemoving(true);
    setRemoveError('');
    try {
      await deleteRevision(seq);
      setConfirming(null);
      refetch();
    } catch (err) {
      setRemoveError(err.message || 'Could not remove that revision.');
    } finally {
      setRemoving(false);
    }
  };

  /** The undo control, shown only on the row that may be removed. */
  const UndoCell = ({ u }) =>
    u.seq !== undoable ? null : confirming === u.seq ? (
      <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => remove(u.seq)}
          disabled={removing}
          style={{
            height: 28, padding: '0 10px', borderRadius: 6, border: 'none',
            background: 'var(--red)', color: '#fff', fontWeight: 600, fontSize: 12,
            cursor: removing ? 'default' : 'pointer', opacity: removing ? 0.7 : 1,
          }}
        >
          {removing ? 'Removing…' : 'Remove'}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(null)}
          disabled={removing}
          style={{
            height: 28, padding: '0 10px', borderRadius: 6, border: '1px solid var(--border)',
            background: 'var(--surface)', color: 'var(--text)', fontSize: 12, cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </span>
    ) : (
      <button
        type="button"
        onClick={() => { setConfirming(u.seq); setRemoveError(''); }}
        title="Remove this upload and go back to the previous prices"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, height: 28, padding: '0 10px',
          borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)',
          color: 'var(--red)', fontWeight: 500, fontSize: 12, cursor: 'pointer',
        }}
      >
        <Icon name="trash" size={13} strokeWidth={1.9} />
        Remove
      </button>
    );

  return (
    <div style={{ padding: isMobile ? 16 : 32, maxWidth: 1000, margin: '0 auto' }} className="fade-up">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 'clamp(20px,4vw,24px)', fontWeight: 600, letterSpacing: '-.01em' }}>
          Upload history
        </h1>
        <p style={{ margin: '4px 0 0', color: 'var(--muted)' }}>
          Every price list on record, newest first. Up and down counts compare each list
          to the one before it. The most recent upload can be removed if it was the wrong file.
        </p>
      </div>

      {removeError && (
        <div
          role="alert"
          style={{
            padding: '10px 14px', borderRadius: 8, background: 'var(--red-bg)',
            color: 'var(--red)', fontSize: 13, marginBottom: 16,
          }}
        >
          {removeError}
        </div>
      )}

      {isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {rows.map((u) => (
            <Card key={u.rev} padding={16}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
                <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', minWidth: 0 }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{describe(u).label}</span>
                  {u.seq === all.at(-1)?.seq && <CurrentPill />}
                </div>
                <div className="num" style={{ fontSize: 12, color: 'var(--muted)', flex: 'none' }}>{u.rev}</div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{describe(u).detail}</div>
              <div
                style={{
                  display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 12,
                  paddingTop: 12, borderTop: '1px solid var(--border)', fontSize: 12,
                }}
              >
                {[
                  ['Parts', fmtInt(u.parts), 'var(--text)'],
                  ['▲ Up', fmtInt(u.up), 'var(--red)'],
                  ['▼ Down', fmtInt(u.down), 'var(--green)'],
                  ['● New', fmtInt(u.new), 'var(--blue)'],
                ].map(([label, value, color]) => (
                  <div key={label}>
                    <div style={{ color: 'var(--muted)' }}>{label}</div>
                    <div className="num" style={{ fontWeight: 600, color, marginTop: 2 }}>{value}</div>
                  </div>
                ))}
              </div>
              {u.seq === undoable && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                  <UndoCell u={u} />
                </div>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <Card padding={0} style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, whiteSpace: 'nowrap' }}>
            <thead>
              <tr>
                <th style={{ ...TH, width: 52 }}>Rev</th>
                <th style={TH}>Price list</th>
                <th style={{ ...TH, textAlign: 'right' }}>Parts priced</th>
                <th style={{ ...TH, textAlign: 'right' }}>▲ Up</th>
                <th style={{ ...TH, textAlign: 'right' }}>▼ Down</th>
                <th style={{ ...TH, textAlign: 'right' }}>● New</th>
                <th style={{ ...TH, textAlign: 'right', width: 170 }} />
              </tr>
            </thead>
            <tbody>
              {rows.map((u, i) => (
                <tr
                  key={u.rev}
                  style={{ background: i % 2 ? 'var(--zebra)' : 'transparent', transition: 'background .15s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface2)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = i % 2 ? 'var(--zebra)' : 'transparent'; }}
                >
                  <td className="num" style={{ ...TD, color: 'var(--muted)' }}>{u.rev}</td>
                  <td style={{ ...TD, maxWidth: 420 }}>
                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                      {describe(u).label}
                      {u.seq === all.at(-1)?.seq && <CurrentPill />}
                    </div>
                    <div
                      style={{
                        fontSize: 12, color: 'var(--muted)', marginTop: 2,
                        overflow: 'hidden', textOverflow: 'ellipsis',
                      }}
                      title={describe(u).detail}
                    >
                      {describe(u).detail}
                    </div>
                  </td>
                  <td className="num" style={{ ...TD, textAlign: 'right' }}>{fmtInt(u.parts)}</td>
                  <td className="num" style={{ ...TD, textAlign: 'right', color: 'var(--red)', fontWeight: 500 }}>{fmtInt(u.up)}</td>
                  <td className="num" style={{ ...TD, textAlign: 'right', color: 'var(--green)', fontWeight: 500 }}>{fmtInt(u.down)}</td>
                  <td className="num" style={{ ...TD, textAlign: 'right', color: 'var(--blue)', fontWeight: 500 }}>{fmtInt(u.new)}</td>
                  <td style={{ ...TD, textAlign: 'right', width: 170 }}><UndoCell u={u} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
