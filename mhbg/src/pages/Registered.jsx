import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { useSite } from '../lib/SiteContext.jsx';
import { formatDate } from '../lib/utils.js';

export default function Registered() {
  const { code } = useParams();
  const { state } = useLocation();
  const { conference } = useSite();
  const [qr, setQr] = useState('');

  useEffect(() => {
    QRCode.toDataURL(code, { width: 440, margin: 1, color: { dark: '#0e2412', light: '#ffffff' } }).then(setQr);
  }, [code]);

  const mode = conference?.checkin_mode || 'both';
  const how =
    mode === 'qr'
      ? 'Show this QR code at the registration stand.'
      : mode === 'voucher'
      ? 'Give this voucher code at the registration stand.'
      : 'Show the QR code or give the voucher code at the registration stand.';

  const shareText = `I'm registered for ${conference?.title || 'the conference'}. My code: ${code}`;

  return (
    <>
      <section className="page-hero">
        <div className="wrap">
          <p className="kicker">{state?.existing ? 'Welcome back' : "You're registered"}</p>
          <h1>{state?.name ? `See you there, ${state.name.split(' ')[0]}` : 'See you there'}</h1>
          <p>{how} Save this page or take a screenshot.</p>
        </div>
      </section>
      <section className="section-dew">
        <div className="wrap">
          <div className="ticket">
            <div className="qr-frame">{qr && <img src={qr} alt={`QR code for ${code}`} />}</div>
            <div>
              <p className="kicker">Your voucher code</p>
              <p className="code-display">{code}</p>
              {conference && (
                <p style={{ color: 'var(--ink-soft)' }}>
                  {conference.title}
                  {conference.event_date ? ` · ${formatDate(conference.event_date)}` : ''}
                  {conference.venue ? ` · ${conference.venue}` : ''}
                </p>
              )}
              <div className="hero-actions">
                {qr && (
                  <a className="btn btn-primary" href={qr} download={`${code}.png`}>Download QR code</a>
                )}
                <a
                  className="btn btn-whatsapp"
                  href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Send to my WhatsApp
                </a>
              </div>
            </div>
          </div>
          <p style={{ marginTop: '2rem' }}>
            <Link to="/conference">Back to the conference page</Link>
          </p>
        </div>
      </section>
    </>
  );
}
