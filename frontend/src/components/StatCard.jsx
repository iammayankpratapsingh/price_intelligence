import { sparkPoints } from '../lib/format.js';
import Card from './Card.jsx';

/** Dashboard KPI tile: label, animated value, trend chip and a sparkline. */
export default function StatCard({ label, value, trend, color, sub, spark }) {
  return (
    <Card padding={20}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            fontSize: 12, fontWeight: 500, color: 'var(--muted)',
            letterSpacing: '.02em', textTransform: 'uppercase',
          }}
        >
          {label}
        </div>
        <span className="num" style={{ fontSize: 12, fontWeight: 600, color, whiteSpace: 'nowrap' }}>
          {trend}
        </span>
      </div>
      <div
        className="num"
        style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-.02em', lineHeight: 1.15, marginTop: 8 }}
      >
        {value}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 10, gap: 8 }}>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{sub}</div>
        {spark?.length > 1 && (
          <svg width="88" height="28" viewBox="0 0 88 28" style={{ flex: 'none', overflow: 'visible' }} aria-hidden="true">
            <polyline
              points={sparkPoints(spark, 88, 28)}
              fill="none"
              stroke={color}
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
    </Card>
  );
}
