import { lazy, Suspense, useEffect } from 'react';
import { Route, Routes, useLocation, Link } from 'react-router-dom';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import { SiteProvider } from './lib/SiteContext.jsx';
import { supabaseConfigured } from './lib/supabase.js';
import Home from './pages/Home.jsx';
import About from './pages/About.jsx';
import Conference from './pages/Conference.jsx';
import Registered from './pages/Registered.jsx';
import Gallery from './pages/Gallery.jsx';
import Testimonies from './pages/Testimonies.jsx';
import Publications from './pages/Publications.jsx';
import Contact from './pages/Contact.jsx';

// Admin (with the QR scanner) loads only when someone opens /admin
const Admin = lazy(() => import('./pages/Admin.jsx'));

const titles = {
  '/': 'Marvellously Helped by God — Raising leaders who make global impact',
  '/about': 'About — Marvellously Helped by God',
  '/conference': 'Conference — Marvellously Helped by God',
  '/gallery': 'Gallery — Marvellously Helped by God',
  '/testimonies': 'Testimonies — Marvellously Helped by God',
  '/testimonies/share': 'Share your testimony — Marvellously Helped by God',
  '/publications': 'Publications — Marvellously Helped by God',
  '/contact': 'Contact — Marvellously Helped by God',
};

function NotFound() {
  return (
    <section className="page-hero">
      <div className="wrap">
        <p className="kicker">Page not found</p>
        <h1>We couldn't find that page</h1>
        <Link to="/" className="btn btn-primary">Back home</Link>
      </div>
    </section>
  );
}

export default function App() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = titles[pathname] || (pathname.startsWith('/admin') ? 'Admin — Marvellously Helped by God' : titles['/']);
  }, [pathname]);

  // Admin tabs share one page key so switching tabs doesn't replay the page animation
  const pageKey = pathname.startsWith('/admin') ? '/admin' : pathname;

  return (
    <SiteProvider>
      <Header />
      {!supabaseConfigured && (
        <div className="notice" style={{ maxWidth: 'none', margin: 0 }}>
          Supabase isn't connected yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file (see README).
        </div>
      )}
      <main className="page active" key={pageKey}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/conference" element={<Conference />} />
          <Route path="/conference/registered/:code" element={<Registered />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/testimonies" element={<Testimonies />} />
          <Route path="/testimonies/share" element={<Testimonies />} />
          <Route path="/publications" element={<Publications />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/admin" element={<Suspense fallback={null}><Admin /></Suspense>} />
          <Route path="/admin/:tab" element={<Suspense fallback={null}><Admin /></Suspense>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </SiteProvider>
  );
}
