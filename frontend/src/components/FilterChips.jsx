const CHIPS = [
  ['all', 'All', 'var(--text)', 'var(--text)'],
  ['up', '▲ Increased', 'var(--red)', 'var(--red-bg)'],
  ['down', '▼ Decreased', 'var(--green)', 'var(--green-bg)'],
  ['same', '— Unchanged', 'var(--muted)', 'var(--surface2)'],
  ['new', '● New', 'var(--blue)', 'var(--blue-bg)'],
  ['dropped', '○ Not in latest', 'var(--muted)', 'var(--surface2)'],
];

/** Status filter pills. "All" inverts when selected; the rest tint. */
export default function FilterChips({ value, onChange, height = 30 }) {
  return (
    <>
      {CHIPS.map(([key, label, color, bg]) => {
        const on = value === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            aria-pressed={on}
            style={{
              height,
              padding: '0 12px',
              borderRadius: 999,
              border: `1px solid ${on ? (key === 'all' ? 'var(--text)' : color) : 'var(--border)'}`,
              background: on ? (key === 'all' ? 'var(--text)' : bg) : 'transparent',
              color: on ? (key === 'all' ? 'var(--surface)' : color) : 'var(--muted)',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all .15s',
            }}
          >
            {label}
          </button>
        );
      })}
    </>
  );
}
