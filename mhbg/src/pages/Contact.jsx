import { useState } from 'react';
import Status from '../components/Status.jsx';
import { useSite } from '../lib/SiteContext.jsx';
import { supabase } from '../lib/supabase.js';
import { DEFAULT_WHATSAPP, whatsappLink } from '../lib/utils.js';

const empty = { kind: 'general', name: '', email: '', body: '' };

export default function Contact() {
  const { settings } = useSite();
  const s = settings || {};
  const [form, setForm] = useState(empty);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const wa = whatsappLink(s.whatsapp_number || DEFAULT_WHATSAPP, "Hi! I'd like to get in touch with Marvellously Helped by God.");
  const email = s.contact_email || 'marvellouslyhelpedbygod@gmail.com';
  const phone = s.phone || '+234 812 997 1991';
  const instagram = s.instagram_url || 'https://www.instagram.com/marvellouslyhelpedbygod';
  const handle = '@' + (instagram.replace(/\/+$/, '').split('/').pop() || 'marvellouslyhelpedbygod');

  async function submit(e) {
    e.preventDefault();
    setStatus(null);
    if (!form.name.trim() || !form.email.trim() || !form.body.trim()) {
      setStatus({ type: 'error', msg: 'Please add your name, email and a message.' });
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      setStatus({ type: 'error', msg: 'Please check your email address.' });
      return;
    }
    setBusy(true);
    const { error } = await supabase.from('messages').insert({
      kind: form.kind,
      name: form.name.trim(),
      email: form.email.trim(),
      subject: form.kind === 'prayer' ? 'Prayer request' : null,
      body: form.body.trim(),
    });
    setBusy(false);
    if (error) {
      setStatus({ type: 'error', msg: 'Your message could not be sent. Please try again.' });
      return;
    }
    setForm(empty);
    setStatus({
      type: 'success',
      msg: form.kind === 'prayer'
        ? 'Thank you — your prayer request has reached our team. We are standing with you.'
        : "Thank you — your message has been sent. We'll get back to you soon.",
    });
  }

  return (
    <>
      <section className="page-hero" id="contact">
        <div className="wrap">
          <p className="kicker">Contact</p>
          <h1>Get in touch</h1>
          <p style={{ maxWidth: '60ch' }}>
            Questions about the movement, the conference, or need someone to stand with you in prayer? Reach out below.
          </p>
        </div>
      </section>
      <section className="section-dew">
        <div className="wrap grid grid-2" style={{ alignItems: 'start' }}>
          <form className="form-card" onSubmit={submit} noValidate>
            <label htmlFor="cType">This is about</label>
            <select id="cType" value={form.kind} onChange={set('kind')}>
              <option value="general">A general question</option>
              <option value="prayer">A prayer request</option>
            </select>
            <label htmlFor="cName">Your name</label>
            <input type="text" id="cName" maxLength={100} autoComplete="name" value={form.name} onChange={set('name')} />
            <label htmlFor="cEmail">Your email</label>
            <input type="email" id="cEmail" maxLength={150} autoComplete="email" value={form.email} onChange={set('email')} />
            <label htmlFor="cMessage">Your message</label>
            <textarea id="cMessage" maxLength={3000} placeholder="Write freely — this goes directly to our team." value={form.body} onChange={set('body')} />
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Sending…' : 'Send message'}</button>
            </div>
            <Status status={status} />
          </form>
          <div>
            <h3>Other ways to reach us</h3>
            <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp">Chat with us on WhatsApp</a>
            <div className="whatsapp-note">Fastest way to reach our team — registration questions, prayer requests, anything at all.</div>
            <p style={{ marginTop: '1.6rem' }}><strong>Email:</strong> <a href={`mailto:${email}`}>{email}</a></p>
            <p><strong>Phone / WhatsApp:</strong> <a href={`tel:${phone.replace(/[^\d+]/g, '')}`}>{phone}</a></p>
            {s.location && <p><strong>Location:</strong> {s.location}</p>}
            <p><strong>Instagram:</strong> <a href={instagram} target="_blank" rel="noopener noreferrer">{handle}</a></p>
          </div>
        </div>
      </section>
    </>
  );
}
