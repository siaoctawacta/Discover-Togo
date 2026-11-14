import { NavLink, Outlet } from 'react-router';
import { useAuth } from '../auth/AuthProvider';
import { useTheme } from '../lib/theme';
import {
  IconAudit, IconDashboard, IconHotel, IconLogout, IconMoon, IconPlace, IconRestaurant, IconReview, IconSun, IconUsers,
} from './icons';
import { Badge } from './ui';

const NAV = [
  { to: '/', label: 'Dashboard', icon: IconDashboard, end: true },
  { to: '/places', label: 'Places', icon: IconPlace },
  { to: '/restaurants', label: 'Restaurants', icon: IconRestaurant },
  { to: '/hotels', label: 'Hotels', icon: IconHotel },
  { to: '/reviews', label: 'Reviews', icon: IconReview },
  { to: '/users', label: 'Users', icon: IconUsers, adminOnly: true },
  { to: '/audit-log', label: 'Audit log', icon: IconAudit, adminOnly: true },
];

export function Layout() {
  const { me, isAdmin, signOut } = useAuth();
  const [theme, toggleTheme] = useTheme();
  const initials = (me?.displayName || me?.email || '?').trim().slice(0, 1).toUpperCase();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-inner">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" width="30" height="30"><rect width="32" height="32" rx="8" fill="currentColor" /><path d="M6 23 13 11l5 8 3-4 5 8z" fill="#5BC0C8" /><circle cx="23" cy="9" r="3" fill="#E8A33D" /></svg>
          </span>
          <span>
            <strong>Discover Togo</strong>
            <small>Admin</small>
          </span>
        </div>
        <nav aria-label="Main">
          <ul className="nav">
            {NAV.filter((n) => !n.adminOnly || isAdmin).map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink to={to} end={end} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                  <Icon />
                  <span>{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <p className="sidebar-foot muted">Sessions end after 30 min of inactivity.</p>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar-spacer" />
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {theme === 'dark' ? <IconSun /> : <IconMoon />}
          </button>
          <div className="user-chip">
            <span className="avatar avatar-initials" aria-hidden="true">{initials}</span>
            <span className="user-chip-text">
              <span className="user-name">{me?.displayName || me?.email}</span>
              <span className="user-email muted">{me?.email}</span>
            </span>
            <Badge tone={me?.role === 'admin' ? 'gold' : 'teal'}>{me?.role}</Badge>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => void signOut()}>
            <IconLogout /> Sign out
          </button>
        </header>
        <main className="content" id="main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
