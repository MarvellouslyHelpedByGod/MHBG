import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Reveal from '../components/Reveal.jsx';
import Status from '../components/Status.jsx';
import { useSite } from '../lib/SiteContext.jsx';
import { supabase } from '../lib/supabase.js';
import { DEFAULT_WHATSAPP, eventTimeText, formatDate, whatsappLink } from '../lib/utils.js';

const empty = { full_name: '', phone: '', email: '', organisation: '', category: '' };
const paras = (text) => (text || '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

export default function Conference() {
  const { conference, settings } = useSite();
  const navigate = useNavigate();
  const { hash } = useLocation();
  const [form, setForm] = useState(empty);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [lookup, setLookup] = useState({ phone: '', full_name: '' });
  const [lookupStatus, setLookupStatus] = useState(null);

  // "Register now" on the home page countdown lands on the form
  const loaded = Boolean(conference);
  useEffect(() => {
    if (hash !== '#register' || !loaded) return;
    const t = setTimeout(() => document.getElementById('register')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
    return () => clearTimeout(t);
  }, [hash, loaded]);

  const cats = conference?.categories?.length ? conference.categories : ['Participant'];
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const waNumber = settings?.whatsapp_number || DEFAULT_WHATSAPP;

  async function submit(e) {
    e.preventDefault();
    setStatus(null);
    if (!form.full_name.trim() || !form.phone.trim()) {
      setStatus({ type: 'error', msg: 'Please enter your full name and phone number.' });
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.rpc('register_for_conference', {
      p_full_name: form.full_name.trim(),
      p_phone: form.phone.trim(),
      p_email: form.email.trim() || null,
      p_organisation: form.organisation.trim() || null,
      p_category: form.category || cats[0],
    });
    setBusy(false);
    if (error) {
      setStatus({ type: 'error', msg: error.message });
      return;
    }
    navigate(`/conference/registered/${data.code}`, { state: { name: data.full_name, existing: data.existing } });
  }

  async function findCode(e) {
    e.preventDefault();
    setLookupStatus(null);
    if (!lookup.phone.trim() || !lookup.full_name.trim()) {
      setLookupStatus({ type: 'error', msg: 'Enter the phone number and full name you registered with.' });
      return;
    }
    const { data, error } = await supabase.rpc('find_registration', {
      p_phone: lookup.phone.trim(),
      p_full_name: lookup.full_name.trim(),
    });
    if (error) return setLookupStatus({ type: 'error', msg: error.message });
    if (!data) return setLookupStatus({ type: 'error', msg: "We couldn't find a registration with those details." });
    navigate(`/conference/registered/${data.code}`, { state: { name: data.full_name, existing: true } });
  }

  if (conference === undefined) {
    return (
      <section className="page-hero"><div className="wrap"><p className="kicker">Annual conference</p><h1>&nbsp;</h1></div></section>
    );
  }

  if (!conference) {
    return (
      <>
        <section className="page-hero">
          <div className="wrap">
            <p className="kicker">Annual conference</p>
            <h1>Our annual gathering</h1>
          </div>
        </section>
        <section className="section-dew">
          <div className="wrap">
            <div className="empty-state">Details for the next conference will be announced soon.</div>
          </div>
        </section>
      </>
    );
  }

  const longDate = formatDate(conference.event_date);
  const timeText = eventTimeText(conference);
  const askText = `Hi! I'd like to ask about registration for the ${conference.theme || conference.title} conference${longDate ? ` on ${longDate}` : ''}.`;

  return (
    <>
      <section className="page-hero" id="conference">
        <div className="wrap">
          <p className="kicker">Annual conference</p>
          <h1>{conference.title}</h1>
          {conference.tagline && <p style={{ maxWidth: '60ch', fontSize: '1.15rem' }}>{conference.tagline}</p>}
        </div>
      </section>

      <section className="section-dew">
        <div className="wrap">
          <Reveal className="conference-card">
            <div>
              {conference.theme && <p className="theme">{conference.theme}</p>}
              {paras(conference.description).map((p, i) => (
                <p key={i} style={{ color: 'var(--ink)', opacity: 0.85 }}>{p}</p>
              ))}
              <div className="hero-actions" style={{ marginTop: '1rem' }}>
                {conference.registration_open && (
                  <a href="#register" className="btn btn-embrace" onClick={(e) => { e.preventDefault(); document.getElementById('register')?.scrollIntoView({ behavior: 'smooth' }); }}>
                    Register now
                  </a>
                )}
                <a href={whatsappLink(waNumber, askText)} target="_blank" rel="noopener noreferrer" className="btn btn-outline-dark">
                  Ask about registration
                </a>
              </div>
            </div>
            <ul className="conference-facts">
              {longDate && <li>Date <span>{longDate}</span></li>}
              {timeText && <li>Time <span>{timeText}</span></li>}
              {conference.venue && <li>Venue <span>{conference.venue}</span></li>}
            </ul>
          </Reveal>
        </div>
      </section>

      {conference.why_body && (
        <section className="section-white">
          <Reveal className="wrap" style={{ maxWidth: 760 }}>
            <p className="kicker">Why this theme</p>
            {conference.why_title && <h2>{conference.why_title}</h2>}
            {paras(conference.why_body).map((p, i) => (
              <p key={i} style={i ? { color: 'var(--ink-soft)' } : undefined}>{p}</p>
            ))}
          </Reveal>
        </section>
      )}

      <section className={conference.why_body ? 'section-dew' : 'section-white'} id="register">
        <div className="wrap">
          <Reveal>
            <p className="kicker">Register</p>
            <h2>Save your seat</h2>
            <p style={{ color: 'var(--ink-soft)' }}>
              Registration is free. After you register you'll get a QR code and a voucher code — bring either one on the
              day to check in at the registration stand.
            </p>
          </Reveal>

          {conference.registration_open ? (
            <form className="form-card" onSubmit={submit} noValidate>
              <label htmlFor="r-name">Full name</label>
              <input id="r-name" type="text" autoComplete="name" maxLength={100} value={form.full_name} onChange={set('full_name')} required />
              <div className="form-row">
                <div>
                  <label htmlFor="r-phone">Phone number</label>
                  <input id="r-phone" type="tel" autoComplete="tel" maxLength={30} value={form.phone} onChange={set('phone')} required />
                </div>
                <div>
                  <label htmlFor="r-email">Email <span style={{ fontWeight: 400, color: 'var(--ink-soft)' }}>(optional)</span></label>
                  <input id="r-email" type="email" autoComplete="email" maxLength={150} value={form.email} onChange={set('email')} />
                </div>
              </div>
              <label htmlFor="r-org">Church or organisation <span style={{ fontWeight: 400, color: 'var(--ink-soft)' }}>(optional)</span></label>
              <input id="r-org" type="text" maxLength={140} value={form.organisation} onChange={set('organisation')} />
              {cats.length > 1 && (
                <>
                  <label htmlFor="r-cat">I'm attending as</label>
                  <select id="r-cat" value={form.category || cats[0]} onChange={set('category')}>
                    {cats.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </>
              )}
              <div className="form-actions">
                <button className="btn btn-primary" disabled={busy}>{busy ? 'Registering…' : 'Register'}</button>
              </div>
              <Status status={status} />
            </form>
          ) : (
            <div className="empty-state" style={{ maxWidth: 640 }}>
              Registration is closed. <a href={whatsappLink(waNumber, askText)} target="_blank" rel="noopener noreferrer">Ask us on WhatsApp</a>.
            </div>
          )}

          <form className="mini-form" onSubmit={findCode} style={{ marginTop: '2.4rem' }}>
            <strong>Already registered and lost your code?</strong>
            <input type="tel" placeholder="Phone number you used" value={lookup.phone} onChange={(e) => setLookup((l) => ({ ...l, phone: e.target.value }))} />
            <input type="text" placeholder="Full name you used" value={lookup.full_name} onChange={(e) => setLookup((l) => ({ ...l, full_name: e.target.value }))} />
            <div><button className="btn btn-outline-dark btn-sm">Find my code</button></div>
            <Status status={lookupStatus} />
          </form>
        </div>
      </section>
    </>
  );
}
