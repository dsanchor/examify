import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { user, loading, logout } = useAuth();

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/sources', label: 'Sources' },
    { to: '/exams', label: 'Exams' },
    { to: '/history', label: 'History' },
  ];

  const userInitial = user?.userDetails?.charAt(0)?.toUpperCase() || '?';

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="header-content">
          <Link to="/" className="logo">
            <span className="logo-icon">📝</span>
            <span className="logo-text">Examify</span>
          </Link>
          <nav className="main-nav">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`nav-link ${location.pathname === link.to ? 'active' : ''}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          {!loading && user && (
            <div className="user-menu">
              <span className="user-avatar">{userInitial}</span>
              <span className="user-name">{user.userDetails}</span>
              <button className="user-logout" onClick={logout} title="Logout">
                ↪
              </button>
            </div>
          )}
        </div>
      </header>
      <main className="app-main">
        <div className="container">{children}</div>
      </main>
      <footer className="app-footer">
        <div className="container">
          <p>&copy; {new Date().getFullYear()} Examify — AI-Powered Exam Generation</p>
        </div>
      </footer>
    </div>
  );
}
