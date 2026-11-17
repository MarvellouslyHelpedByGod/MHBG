import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Reveal from '../components/Reveal.jsx';
import Status from '../components/Status.jsx';
import { supabase } from '../lib/supabase.js';
import { formatDate } from '../lib/utils.js';

const empty = { name: '', location: '', title: '', body: '' };

export default function Testimonies() {
  const { pathname } = useLocation();
  const [items, setItems] = useState(null);
  const [form, setForm] = useState(empty);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    supabase
      .from('testimonies')
      .select('id,name,location,title,body,created_at')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .then(({ data }) => setItems(data || []));
  }, []);

  // /testimonies/share lands on the form, as #/testimonies/share did on the original site
  useEffect(() => {
    if (pathname.endsWith('/share')) {
      const t = setTimeout(() => document.getElementById('share')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
      return () => clearTimeout(t);
    }
  }, [pathname]);

  async function submit(e) {
    e.preventDefault();
    setStatus(null);
    if (!form.name.trim() || !form.title.trim() || !form.body.trim()) {
      setStatus({ type: 'error', msg: 'Please fill in your name, a short title and your testimony.' });
      return;
    }
    setBusy(true);
    const { error } = await supabase.from('testimonies').insert({
      name: form.name.trim(),
      location: form.location.trim() || null,
      title: form.title.trim(),
      body: form.body.trim(),
    });
    setBusy(false);
    if (error) {
      setStatus({ type: 'error', msg: 'Something went wrong sending your testimony. Please try again.' });
      return;
    }
    setForm(empty);
    setStatus({ type: 'success', msg: 'Thank you for sharing! A team member will review your testimony before it appears here.' });
  }

  return (
    <>
      <section className="page-hero" id="testimonies">
        <div className="wrap">
          <p className="kicker">Testimonies</p>
          <h1>Stories of how far we've come</h1>
          <p style={{ maxWidth: '60ch' }}>
            However small or large, your story could be exactly what someone else needs to hear today.
          </p>
        </div>
      </section>

      <section className="section-dew">
        <div className="wrap">
          <div className="section-head"><div><h2>Shared testimonies</h2></div></div>
          {items === null ? null : items.length === 0 ? (
            <div className="empty-state">No testimonies yet — be the first to share one below.</div>
          ) : (
            <div className="testimony-list">
              {items.map((t) => (
                <Reveal as="article" className="testimony-item" key={t.id}>
                  <span className="quote-mark">&ldquo;</span>
                  <h3>{t.title}</h3>
                  <p className="meta">
                    {t.name}
                    {t.location ? ` · ${t.location}` : ''} · {formatDate(t.created_at)}
                  </p>
                  {t.body.split(/\n\s*\n/).map((p, i) => <p key={i}>{p}</p>)}
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="section-white" id="share">
        <div className="wrap">
          <p className="kicker">Your turn</p>
          <h2>Share your testimony</h2>
          <p style={{ maxWidth: '60ch' }}>
            Write it in your own words. A team member reviews every submission before it appears on this page.
          </p>
          <form className="form-card" onSubmit={submit} noValidate>
            <label htmlFor="tName">Your name</label>
            <input type="text" id="tName" maxLength={100} placeholder="e.g. Bunmi O." value={form.name} onChange={set('name')} />
            <label htmlFor="tLocation">
              Where you're writing from <span style={{ fontWeight: 400, color: 'var(--ink-soft)' }}>(optional)</span>
            </label>
            <input type="text" id="tLocation" maxLength={100} placeholder="e.g. Lagos, Nigeria" value={form.location} onChange={set('location')} />
            <label htmlFor="tTitle">Give your testimony a short title</label>
            <input type="text" id="tTitle" maxLength={140} placeholder="e.g. He turned my mourning into dancing" value={form.title} onChange={set('title')} />
            <label htmlFor="tStory">Your testimony</label>
            <textarea id="tStory" maxLength={4000} placeholder="Tell us what happened, and what it means to you…" value={form.body} onChange={set('body')} />
            <p className="form-hint">By submitting, you agree we can publish this testimony on our website and social media once reviewed.</p>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Sending…' : 'Submit my testimony'}</button>
            </div>
            <Status status={status} />
          </form>
        </div>
      </section>
    </>
  );
}
