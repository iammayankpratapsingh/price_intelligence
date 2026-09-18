import { meta, pctText } from '../lib/format.js';

/** The pill that carries a part's change direction everywhere it appears. */
export default function Badge({ part, children, minWidth }) {
  const m = meta(part.status);
  return (
    <span
      className="num"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        color: m.color,
        background: m.bg,
        whiteSpace: 'nowrap',
        minWidth,
        justifyContent: 'center',
      }}
    >
      {m.sym} {children ?? pctText(part)}
    </span>
  );
}
