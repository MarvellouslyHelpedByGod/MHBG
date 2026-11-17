import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';

const links = [
  ['/', 'Home'],
  ['/about', 'About'],
  ['/conference', 'Conference'],
  ['/gallery', 'Gallery'],
  ['/testimonies', 'Testimonies'],
  ['/publications', 'Publications'],
  ['/contact', 'Contact'],
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`site-header${scrolled ? ' scrolled' : ''}`}>
      <div className="wrap">
        <Link to="/" className="wordmark">
          <span className="top">Marvellously</span>
          <span className="main">Helped by God</span>
        </Link>
        <button
          className="nav-toggle"
          aria-expanded={open}
          aria-controls="primaryNav"
          onClick={() => setOpen((o) => !o)}
        >
          ☰ Menu
        </button>
        <nav className={`primary-nav${open ? ' open' : ''}`} id="primaryNav">
          {links.map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => (isActive ? 'current' : '')}
            >
              {label}
            </NavLink>
          ))}
          <Link to="/testimonies/share" className="btn btn-outline-dark">
            Share your testimony
          </Link>
        </nav>
      </div>
    </header>
  );
}
