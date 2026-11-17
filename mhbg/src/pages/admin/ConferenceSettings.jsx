import { useEffect, useState } from 'react';
import Status from '../../components/Status.jsx';
import { useSite } from '../../lib/SiteContext.jsx';
import { supabase } from '../../lib/supabase.js';

const blank = {
  title: '', theme: '', tagline: '', why_title: '', why_body: '', event_date: '', start_time: '', end_time: '', venue: '', description: '',
  capacity: '', registration_open: true, checkin_mode: 'both', categories: 'Participant',
};

function toForm(c) {
  if (!c) return blank;
  return {
    title: c.title || '',
    theme: c.theme || '',
    tagline: c.tagline || '',
    why_title: c.why_title || '',
    why_body: c.why_body || '',
    event_date: c.event_date || '',
    start_time: (c.start_time || '').slice(0, 5),
    end_time: (c.end_time || '').slice(0, 5),
    venue: c.venue || '',
    description: c.description || '',
    capacity: c.capacity ?? '',
    registration_open: c.registration_open,
    checkin_mode: c.checkin_mode || 'both',
    categories: (c.categories || ['Participant']).join(', '),
  };
}

function toRow(f) {
  const cats = f.categories.split(',').map((s) => s.trim()).filter(Boolean);
  return {
    title: f.title.trim(),
    theme: f.theme.trim() || null,
    tagline: f.tagline.trim() || null,
    why_title: f.why_title.trim() || null,
    why_body: f.why_body.trim() || null,
    event_date: f.event_date || null,
    start_time: f.start_time || null,
    end_time: f.end_time || null,
    venue: f.venue.trim() || null,
    description: f.description.trim() || null,
    capacity: f.capacity === '' ? null : Number(f.capacity),
    registration_open: f.registration_open,
    checkin_mode: f.checkin_mode,
    categories: cats.length ? cats : ['Participant'],
  };
}

export default function ConferenceSettings() {
  const { conference, reload } = useSite();
  const [form, setForm] = useState(() => toForm(conference));
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [creatingNew, setCreatingNew] = useState(false);

  useEffect(() => {
    if (!creatingNew) setForm(toForm(conference));
  }, [conference, creatingNew]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  async function save(e) {
    e.preventDefault();
    if (!form.title.trim()) return setStatus({ type: 'error', msg: 'Give the programme a title.' });
    if (form.end_time && !form.start_time) return setStatus({ type: 'error', msg: 'Add a start time as well as the end time.' });
    if (form.end_time && form.end_time <= form.start_time) return setStatus({ type: 'error', msg: 'The end time must be after the start time.' });
    setBusy(true);
    setStatus(null);
    let error;
    if (conference && !creatingNew) {
      ({ error } = await supabase.from('conferences').update(toRow(form)).eq('id', conference.id));
    } else {
      if (conference) {
        const r = await supabase.from('conferences').update({ is_active: false }).eq('id', conference.id);
        if (r.error) { setBusy(false); return setStatus({ type: 'error', msg: r.error.message }); }
      }
      ({ error } = await supabase.from('conferences').insert({
        ...toRow(form),
        is_active: true,
        tag_settings: conference?.tag_settings || {},
      }));
    }
    setBusy(false);
    if (error) return setStatus({ type: 'error', msg: error.message });
    setCreatingNew(false);
    setStatus({ type: 'success', msg: 'Saved — the Conference page and the home page countdown are updated.' });
    reload();
  }

  return (
    <div>
      <div className="section-head">
        <div>
          <h2>{creatingNew || !conference ? 'New programme' : 'Programme details'}</h2>
          <p style={{ color: 'var(--ink-soft)' }}>What you enter here shows on the Conference page and starts the countdown on the home page.</p>
        </div>
        {conference && !creatingNew && (
          <button
            className="btn btn-outline-dark btn-sm"
            onClick={() => {
              if (confirm('Create the next programme? The current one will be archived; its registrations are kept.')) {
                setCreatingNew(true);
                setForm(blank);
              }
            }}
          >
            Create the next programme
          </button>
        )}
      </div>

      <form className="form-card" onSubmit={save} style={{ maxWidth: 760 }}>
        <label>Title</label>
        <input type="text" placeholder="e.g. 2027 Conference: Back to Eden" value={form.title} onChange={set('title')} />
        <label>Theme</label>
        <input type="text" placeholder="e.g. Back to Eden" value={form.theme} onChange={set('theme')} />
        <label>Tagline (under the page title)</label>
        <input type="text" value={form.tagline} onChange={set('tagline')} />
        <label>Date</label>
        <input type="date" value={form.event_date} onChange={set('event_date')} />
        <div className="form-row">
          <div><label>Starts at</label><input type="time" value={form.start_time} onChange={set('start_time')} /></div>
          <div><label>Ends at <span style={{ fontWeight: 400 }}>(optional)</span></label><input type="time" value={form.end_time} onChange={set('end_time')} /></div>
        </div>
        <p className="form-hint">Nigeria time. The countdown on the home page runs to this date and start time.</p>
        <label>Venue</label>
        <input type="text" value={form.venue} onChange={set('venue')} />
        <label>Short description (on the yellow conference card)</label>
        <textarea value={form.description} onChange={set('description')} style={{ minHeight: 90 }} />
        <label>"Why this theme" heading</label>
        <input type="text" value={form.why_title} onChange={set('why_title')} />
        <label>"Why this theme" text</label>
        <textarea value={form.why_body} onChange={set('why_body')} style={{ minHeight: 200 }} />
        <p className="form-hint">Leave a blank line between paragraphs. Leave empty to hide this section.</p>
        <div className="form-row">
          <div>
            <label>Capacity (optional)</label>
            <input type="number" min="1" placeholder="No limit" value={form.capacity} onChange={set('capacity')} />
          </div>
          <div>
            <label>Check-in method</label>
            <select value={form.checkin_mode} onChange={set('checkin_mode')}>
              <option value="both">QR code or voucher code</option>
              <option value="qr">QR code only</option>
              <option value="voucher">Voucher code only</option>
            </select>
          </div>
        </div>
        <label>Attendee categories</label>
        <input type="text" value={form.categories} onChange={set('categories')} />
        <p className="form-hint">Separate with commas, e.g. Participant, Volunteer, Minister. The first is the default. These print on tags.</p>
        <label className="checkbox" style={{ marginTop: '1rem' }}>
          <input type="checkbox" checked={form.registration_open} onChange={set('registration_open')} /> Registration is open
        </label>
        <div className="form-actions row-actions">
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
          {creatingNew && (
            <button type="button" className="btn btn-outline-dark" onClick={() => setCreatingNew(false)}>Cancel</button>
          )}
        </div>
        <Status status={status} />
      </form>
    </div>
  );
}
