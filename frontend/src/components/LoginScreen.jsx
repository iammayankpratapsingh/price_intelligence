import Icon from './Icon.jsx';
import { CarHero, CarSide, PartsGlyphs } from './CarArt.jsx';

const FIELD = {
  width: '100%',
  height: 48,
  padding: '0 44px 0 44px',
  borderRadius: 10,
  border: '1px solid var(--border)',
  background: 'var(--bg)',
  color: 'var(--text)',
  fontSize: 15,
  outline: 'none',
  transition: 'border-color .15s, box-shadow .15s, background .15s',
};

function Field({ icon, trailing, ...props }) {
  return (
    <div style={{ position: 'relative' }}>
      <Icon
        name={icon}
        size={18}
        strokeWidth={1.8}
        style={{ position: 'absolute', left: 14, top: 15, color: 'var(--faint)', pointerEvents: 'none' }}
      />
      <input
        {...props}
        style={FIELD}
        onFocus={(e) => {
          e.target.style.borderColor = 'var(--red)';
          e.target.style.boxShadow = '0 0 0 4px var(--red-bg)';
          e.target.style.background = 'var(--surface)';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = 'var(--border)';
          e.target.style.boxShadow = 'none';
          e.target.style.background = 'var(--bg)';
        }}
      />
      {trailing}
    </div>
  );
}

/** The marketing half: gradient, vector cars, and three live-sounding stats. */
function Showcase({ compact, hideHero = false }) {
  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(150deg, #1B2430 0%, #232E3D 45%, #3A1C24 100%)',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: compact ? '32px 24px' : '56px 56px',
        minHeight: compact ? 320 : '100%',
      }}
    >
      {/* blueprint grid + glows */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          maskImage: 'radial-gradient(120% 100% at 50% 40%, #000 45%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(120% 100% at 50% 40%, #000 45%, transparent 100%)',
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          width: 520,
          height: 520,
          right: -180,
          top: -160,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(196,41,58,.45), transparent 65%)',
          filter: 'blur(10px)',
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          width: 420,
          height: 420,
          left: -140,
          bottom: -160,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(79,99,210,.35), transparent 65%)',
          filter: 'blur(10px)',
        }}
      />

      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: compact ? 20 : 36 }}>
          <div
            style={{
              width: 38, height: 38, borderRadius: 10, background: 'var(--red)', display: 'grid',
              placeItems: 'center', fontWeight: 700, fontSize: 15, boxShadow: '0 6px 18px rgba(196,41,58,.45)',
            }}
          >
            PX
          </div>
          <div style={{ lineHeight: 1.25 }}>
            <div style={{ fontWeight: 600, fontSize: 16 }}>PartsIndex</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.6)' }}>Price intelligence</div>
          </div>
        </div>

        <h2
          style={{
            margin: 0,
            fontSize: compact ? 24 : 34,
            lineHeight: 1.2,
            fontWeight: 600,
            letterSpacing: '-.02em',
            maxWidth: 460,
          }}
        >
          Every part, every revision,
          <br />
          <span style={{ color: '#FF8A98' }}>priced to the paisa.</span>
        </h2>
        <p
          style={{
            margin: '12px 0 0',
            color: 'rgba(255,255,255,.68)',
            fontSize: compact ? 14 : 15,
            maxWidth: 420,
            lineHeight: 1.6,
          }}
        >
          Compare MRP lists across revisions, spot the movers, and keep your workshop quoting the current price.
        </p>

        {/* hero car — omitted while the screen is being cut, so the driving car
            reads alone and each of the many strip copies stays cheap */}
        <div
          style={{
            position: 'relative',
            margin: compact ? '24px auto 0' : '36px auto 0',
            maxWidth: compact ? 320 : 440,
            // Reserve the space so the strips line up with the live screen.
            aspectRatio: hideHero ? '520 / 240' : undefined,
          }}
        >
          {!hideHero && (
            <>
              <div style={{ animation: 'floatY 6s ease-in-out infinite' }}>
                <CarHero />
              </div>
              <div
                aria-hidden
                style={{
                  position: 'absolute', right: compact ? -6 : -26, top: -12, width: compact ? 92 : 124,
                  opacity: 0.85, animation: 'floatY 5s ease-in-out infinite 1.2s',
                }}
              >
                <CarSide color="#4F63D2" />
              </div>
            </>
          )}
        </div>

        {!compact && (
          <div style={{ marginTop: 28, color: 'rgba(255,255,255,.4)', maxWidth: 300, aspectRatio: hideHero ? '300 / 90' : undefined }}>
            {!hideHero && <PartsGlyphs />}
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0,1fr))',
            gap: compact ? 10 : 16,
            marginTop: compact ? 24 : 34,
            maxWidth: 460,
          }}
        >
          {[
            ['66,828', 'Parts tracked'],
            ['3+', 'Price revisions'],
            ['09 Aug 2026', 'Latest list'],
          ].map(([value, label]) => (
            <div
              key={label}
              style={{
                padding: compact ? '10px 12px' : '14px 16px',
                borderRadius: 12,
                background: 'rgba(255,255,255,.07)',
                border: '1px solid rgba(255,255,255,.12)',
                backdropFilter: 'blur(6px)',
              }}
            >
              <div className="num" style={{ fontSize: compact ? 15 : 18, fontWeight: 600, letterSpacing: '-.01em' }}>
                {value}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.6)', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * The sign-in screen as pure presentation. The live page passes real handlers;
 * the slice transition renders two inert copies of it and cuts them apart, so
 * the animation happens on this screen rather than replacing it.
 */
export default function LoginScreen({
  isMobile,
  dark,
  onToggleTheme,
  email,
  password,
  show,
  error,
  busy,
  onSubmit,
  onEmailChange,
  onPasswordChange,
  onToggleShow,
  remember = true,
  onRememberChange,
  inert = false,
  hideHero = false,
}) {
  const noop = (e) => e.preventDefault();

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'minmax(0,1.05fr) minmax(0,1fr)',
        background: 'var(--bg)',
      }}
    >
      <Showcase compact={isMobile} hideHero={hideHero} />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: isMobile ? '28px 20px 44px' : '48px',
          position: 'relative',
        }}
      >
        <button
          type="button"
          onClick={inert ? noop : onToggleTheme}
          tabIndex={inert ? -1 : 0}
          aria-label="Toggle colour theme"
          style={{
            position: 'absolute', top: isMobile ? 16 : 28, right: isMobile ? 16 : 28,
            width: 36, height: 36, borderRadius: 8, border: '1px solid var(--border)',
            background: 'var(--surface)', color: 'var(--muted)', display: 'grid',
            placeItems: 'center', cursor: 'pointer',
          }}
        >
          <Icon name={dark ? 'sun' : 'moon'} size={16} strokeWidth={2} />
        </button>

        <form
          onSubmit={inert ? noop : onSubmit}
          className={inert ? undefined : 'fade-up'}
          style={{ width: '100%', maxWidth: 400 }}
        >
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 600, letterSpacing: '-.02em' }}>Sign in</h1>
          <p style={{ margin: '6px 0 26px', color: 'var(--muted)' }}>
            Welcome back. Enter your details to open the catalog.
          </p>

          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }} htmlFor={inert ? undefined : 'email'}>
            Email
          </label>
          <Field
            id={inert ? undefined : 'email'}
            icon="mail"
            type="email"
            autoComplete="username"
            inputMode="email"
            placeholder="you@workshop.com"
            value={email}
            onChange={inert ? undefined : onEmailChange}
            readOnly={inert}
            tabIndex={inert ? -1 : 0}
            required={!inert}
          />

          <label
            style={{ display: 'block', fontSize: 13, fontWeight: 500, margin: '16px 0 6px' }}
            htmlFor={inert ? undefined : 'password'}
          >
            Password
          </label>
          <Field
            id={inert ? undefined : 'password'}
            icon="lock"
            type={show ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={inert ? undefined : onPasswordChange}
            readOnly={inert}
            tabIndex={inert ? -1 : 0}
            required={!inert}
            trailing={
              <button
                type="button"
                onClick={inert ? noop : onToggleShow}
                tabIndex={inert ? -1 : 0}
                aria-label={show ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute', right: 6, top: 6, width: 36, height: 36, borderRadius: 8,
                  border: 'none', background: 'transparent', color: 'var(--faint)',
                  display: 'grid', placeItems: 'center', cursor: 'pointer',
                }}
              >
                <Icon name={show ? 'eyeOff' : 'eye'} size={17} strokeWidth={1.8} />
              </button>
            }
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '14px 0 20px', gap: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--muted)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={remember}
                onChange={inert ? noop : onRememberChange}
                tabIndex={inert ? -1 : 0}
                style={{ accentColor: 'var(--red)', width: 15, height: 15 }}
              />
              Keep me signed in
            </label>
            <a href="#" onClick={noop} tabIndex={inert ? -1 : 0} style={{ fontSize: 13, fontWeight: 500 }}>
              Forgot password?
            </a>
          </div>

          {error && (
            <div
              role="alert"
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10,
                background: 'var(--red-bg)', color: 'var(--red)', fontSize: 13, fontWeight: 500,
                marginBottom: 16, animation: 'fadeUp .2s ease',
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--red)', flex: 'none' }} />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            tabIndex={inert ? -1 : 0}
            style={{
              width: '100%', height: 48, borderRadius: 10, border: 'none',
              background: 'var(--red)', color: '#fff', fontWeight: 600, fontSize: 15,
              cursor: busy ? 'progress' : 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 10, opacity: busy ? 0.85 : 1,
              boxShadow: '0 6px 18px rgba(196,41,58,.28)', transition: 'filter .15s, transform .1s',
            }}
          >
            {busy && (
              <span
                style={{
                  width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,.4)',
                  borderTopColor: '#fff', animation: 'spin .7s linear infinite',
                }}
              />
            )}
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
