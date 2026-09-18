import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import Icon from './Icon.jsx';
import { useAuth } from '../lib/auth.jsx';
import { useTheme } from '../lib/theme.jsx';
import { useMediaQuery } from '../lib/useMediaQuery.js';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/search', label: 'Search', icon: 'search' },
  { to: '/upload', label: 'Upload', icon: 'upload' },
  { to: '/billing', label: 'Billing', icon: 'bill' },
  { to: '/analytics', label: 'Analytics', icon: 'analytics' },
  { to: '/history', label: 'History', icon: 'history' },
];

function NavItem({ item, expanded, onNavigate }) {
  return (
    <NavLink
      to={item.to}
      title={item.label}
      onClick={onNavigate}
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        height: 40,
        padding: '0 10px',
        borderRadius: 8,
        cursor: 'pointer',
        color: isActive ? '#fff' : 'var(--navtext)',
        background: isActive ? 'var(--nav2)' : 'transparent',
        fontWeight: 500,
        textDecoration: 'none',
        whiteSpace: 'nowrap',
        transition: 'background .15s, color .15s',
      })}
      onMouseEnter={(e) => {
        if (!e.currentTarget.classList.contains('active')) {
          e.currentTarget.style.background = 'var(--nav2)';
          e.currentTarget.style.color = '#fff';
        }
      }}
      onMouseLeave={(e) => {
        if (!e.currentTarget.classList.contains('active')) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'var(--navtext)';
        }
      }}
    >
      <Icon name={item.icon} />
      {expanded && <span>{item.label}</span>}
    </NavLink>
  );
}

function Sidebar({ expanded, onToggle, onNavigate, mobile }) {
  return (
    <aside
      style={{
        width: expanded ? 232 : 64,
        flex: 'none',
        background: 'var(--nav)',
        color: 'var(--navtext)',
        display: 'flex',
        flexDirection: 'column',
        padding: '16px 12px',
        transition: 'width .2s ease, background-color .3s',
        overflow: 'hidden',
        height: '100%',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 40, padding: '0 8px', marginBottom: 24 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            background: 'var(--red)',
            flex: 'none',
            display: 'grid',
            placeItems: 'center',
            color: '#fff',
            fontWeight: 700,
            fontSize: 13,
            letterSpacing: '.02em',
          }}
        >
          PX
        </div>
        {expanded && (
          <div style={{ whiteSpace: 'nowrap', lineHeight: 1.2 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#fff' }}>PartsIndex</div>
            <div style={{ fontSize: 11, color: 'var(--navmuted)' }}>Price intelligence</div>
          </div>
        )}
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {NAV.map((item) => (
          <NavItem key={item.to} item={item} expanded={expanded} onNavigate={onNavigate} />
        ))}
      </nav>

      <div style={{ flex: 1 }} />

      {!mobile && (
        <button
          type="button"
          onClick={onToggle}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            height: 40,
            padding: '0 10px',
            borderRadius: 8,
            cursor: 'pointer',
            color: 'var(--navmuted)',
            background: 'transparent',
            border: 'none',
            whiteSpace: 'nowrap',
            transition: 'background .15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--nav2)'; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--navmuted)'; }}
        >
          <Icon name="panel" />
          {expanded && <span style={{ fontSize: 13 }}>Collapse</span>}
        </button>
      )}
    </aside>
  );
}

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { dark, toggle } = useTheme();
  const isMobile = useMediaQuery('(max-width: 900px)');

  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [query, setQuery] = useState('');

  // The drawer must never survive a route change or a resize to desktop.
  useEffect(() => setDrawer(false), [location.pathname]);
  useEffect(() => { if (!isMobile) setDrawer(false); }, [isMobile]);
  useEffect(() => {
    document.body.style.overflow = drawer ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawer]);

  const submitSearch = (value) => {
    setQuery(value);
    navigate(value ? `/search?q=${encodeURIComponent(value)}` : '/search');
  };

  return (
    <div
      style={{
        display: 'flex',
        height: '100dvh',
        background: 'var(--bg)',
        color: 'var(--text)',
        overflow: 'hidden',
        transition: 'background-color .3s, color .3s',
      }}
    >
      {!isMobile && (
        <Sidebar expanded={!collapsed} onToggle={() => setCollapsed((c) => !c)} />
      )}

      {isMobile && drawer && (
        <>
          <div
            onClick={() => setDrawer(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(10,13,18,.5)', zIndex: 40, backdropFilter: 'blur(2px)' }}
          />
          <div style={{ position: 'fixed', insetInlineStart: 0, top: 0, bottom: 0, zIndex: 41, animation: 'fadeUp .2s ease' }}>
            <Sidebar expanded mobile onNavigate={() => setDrawer(false)} />
          </div>
        </>
      )}

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <header
          style={{
            minHeight: 56,
            flex: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? 10 : 16,
            padding: isMobile ? '0 12px' : '0 24px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--surface)',
            transition: 'background-color .3s, border-color .3s',
          }}
        >
          {isMobile && (
            <button
              type="button"
              aria-label="Open navigation"
              onClick={() => setDrawer(true)}
              style={{
                width: 36, height: 36, borderRadius: 8, border: '1px solid var(--border)',
                background: 'var(--surface)', color: 'var(--text)', display: 'grid',
                placeItems: 'center', cursor: 'pointer', flex: 'none',
              }}
            >
              <Icon name="menu" size={18} strokeWidth={2} />
            </button>
          )}

          <div style={{ flex: 1, minWidth: 0, maxWidth: 520, position: 'relative' }}>
            <Icon
              name="search"
              size={16}
              strokeWidth={2}
              style={{ position: 'absolute', left: 12, top: 11, color: 'var(--faint)', pointerEvents: 'none' }}
            />
            <input
              value={query}
              onChange={(e) => submitSearch(e.target.value)}
              onFocus={() => { if (location.pathname !== '/search') navigate('/search'); }}
              placeholder={isMobile ? 'Search parts' : 'Search part number or description'}
              aria-label="Search parts"
              style={{
                width: '100%',
                height: 38,
                padding: '0 12px 0 36px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--text)',
                fontSize: 14,
                outline: 'none',
                transition: 'border-color .15s, box-shadow .15s',
              }}
              onFocusCapture={(e) => {
                e.target.style.borderColor = 'var(--red)';
                e.target.style.boxShadow = '0 0 0 3px var(--red-bg)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--border)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {!isMobile && <div style={{ flex: 1 }} />}

          {!isMobile && (
            <div style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
              Latest revision <span style={{ color: 'var(--text)', fontWeight: 500 }}>MRP · 09 Aug 2026</span>
            </div>
          )}

          <button
            type="button"
            onClick={toggle}
            title="Toggle theme"
            aria-label="Toggle colour theme"
            style={{
              width: 36, height: 36, borderRadius: 8, border: '1px solid var(--border)',
              background: 'var(--surface)', color: 'var(--muted)', display: 'grid',
              placeItems: 'center', cursor: 'pointer', flex: 'none',
              transition: 'background .15s, color .15s',
            }}
          >
            <Icon name={dark ? 'sun' : 'moon'} size={16} strokeWidth={2} />
          </button>

          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 8,
              borderLeft: isMobile ? 'none' : '1px solid var(--border)', flex: 'none',
            }}
          >
            <div
              title={user?.email}
              style={{
                width: 32, height: 32, borderRadius: '50%', background: 'var(--nav)', color: '#fff',
                display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 600, flex: 'none',
              }}
            >
              {user?.initials || 'WA'}
            </div>
            {!isMobile && (
              <div style={{ lineHeight: 1.2, whiteSpace: 'nowrap' }}>
                <div style={{ fontWeight: 500, fontSize: 13 }}>{user?.name || 'Workshop admin'}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{user?.role || 'Authorized service'}</div>
              </div>
            )}
            <button
              type="button"
              onClick={signOut}
              title="Sign out"
              aria-label="Sign out"
              style={{
                width: 34, height: 34, borderRadius: 8, border: '1px solid var(--border)',
                background: 'var(--surface)', color: 'var(--muted)', display: 'grid',
                placeItems: 'center', cursor: 'pointer', flex: 'none',
              }}
            >
              <Icon name="logout" size={16} strokeWidth={2} />
            </button>
          </div>
        </header>

        <main style={{ flex: 1, overflow: 'auto', position: 'relative', WebkitOverflowScrolling: 'touch' }}>
          <Outlet context={{ isMobile }} />
        </main>
      </div>
    </div>
  );
}
