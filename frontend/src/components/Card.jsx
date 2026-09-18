/** The standard surface panel: border, radius, shadow. */
export default function Card({ children, style, padding = 24, ...rest }) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        boxShadow: 'var(--shadow)',
        padding,
        transition: 'background-color .3s, border-color .3s',
        minWidth: 0,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 24,
        flexWrap: 'wrap',
        marginBottom: 24,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <h1 style={{ margin: 0, fontSize: 'clamp(20px, 4vw, 24px)', fontWeight: 600, letterSpacing: '-.01em' }}>
          {title}
        </h1>
        {subtitle && <p style={{ margin: '4px 0 0', color: 'var(--muted)' }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
