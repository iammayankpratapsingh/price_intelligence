/** Full-panel loading, error and empty states shared by the screens. */

export function Loading({ label = 'Loading parts…' }) {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'var(--bg)', zIndex: 5 }}>
      <div style={{ textAlign: 'center', padding: 24 }}>
        <div
          style={{
            width: 180, height: 4, borderRadius: 2, margin: '0 auto 12px',
            background: 'linear-gradient(90deg, var(--surface2) 25%, var(--red) 50%, var(--surface2) 75%)',
            backgroundSize: '200% 100%', animation: 'shimmer 1.2s linear infinite',
          }}
        />
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>{label}</div>
      </div>
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div style={{ display: 'grid', placeItems: 'center', padding: '64px 24px' }}>
      <div style={{ textAlign: 'center', maxWidth: 460 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--red)', marginBottom: 6 }}>
          Could not load the parts data
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
          {message} Check that the API is running on port 4000 (<code>npm start</code> in{' '}
          <code>price_intelligence/backend</code>).
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            style={{
              marginTop: 16, height: 36, padding: '0 16px', borderRadius: 8,
              border: '1px solid var(--border)', background: 'var(--surface)',
              color: 'var(--text)', fontWeight: 500, cursor: 'pointer',
            }}
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

export function Empty({ title, hint }) {
  return (
    <div style={{ padding: '56px 24px', textAlign: 'center', color: 'var(--muted)' }}>
      <div style={{ fontWeight: 600, color: 'var(--text)' }}>{title}</div>
      {hint && <div style={{ fontSize: 13, marginTop: 4 }}>{hint}</div>}
    </div>
  );
}
