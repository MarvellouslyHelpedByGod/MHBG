import { Link } from 'react-router-dom';
import { useSite } from '../lib/SiteContext.jsx';

export default function Footer() {
  const { settings } = useSite();
  const instagram = settings?.instagram_url || 'https://www.instagram.com/marvellouslyhelpedbygod';

  return (
    <footer className="site-footer">
      <div className="wrap">
        <div>
          <h4>Marvellously Helped by God</h4>
          <p className="foot-verse">"We are helped to become strong, and we become strong so that we can strengthen others."</p>
          <p style={{ color: '#8aa07f', fontSize: '.85rem' }}>— 2 Chronicles 26:15b</p>
        </div>
        <div>
          <h4>Explore</h4>
          <p><Link to="/about">About the movement</Link></p>
          <p><Link to="/conference">Annual conference</Link></p>
          <p><Link to="/testimonies">Testimonies</Link></p>
          <p><Link to="/publications">Publications</Link></p>
          <p><Link to="/gallery">Gallery</Link></p>
        </div>
        <div>
          <h4>Connect</h4>
          <p><a href={instagram} target="_blank" rel="noopener noreferrer">Instagram</a></p>
          <p><Link to="/contact">Contact &amp; prayer requests</Link></p>
        </div>
      </div>
      <div className="wrap bottom">
        <span>&copy; {new Date().getFullYear()} Marvellously Helped by God. Founded by Mrs Modupe Bakare.</span>
      </div>
    </footer>
  );
}
