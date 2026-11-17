import { useEffect, useState } from 'react';
import Status from '../../components/Status.jsx';
import { useSite } from '../../lib/SiteContext.jsx';
import { publicUrl, supabase, uploadFile } from '../../lib/supabase.js';
import { resizeImage } from '../../lib/utils.js';

const FIELDS = [
  ['whatsapp_number', 'WhatsApp number', 'tel', 'e.g. 0803 000 0000'],
  ['contact_email', 'Contact email', 'email', ''],
  ['phone', 'Phone (shown on site)', 'tel', ''],
  ['instagram_url', 'Instagram link', 'url', 'https://instagram.com/…'],
  ['facebook_url', 'Facebook link', 'url', 'https://facebook.com/…'],
  ['youtube_url', 'YouTube link', 'url', 'https://youtube.com/…'],
];

export default function SiteSettings() {
  const { settings, reload } = useSite();
  const [form, setForm] = useState({});
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => setForm(settings || {}), [settings]);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function uploadImage(key, file, max) {
    if (!file) return;
    try {
      setStatus({ type: 'success', msg: 'Uploading…' });
      const { blob } = await resizeImage(file, max);
      const path = await uploadFile('site', blob, 'jpg');
      setForm((f) => ({ ...f, [key]: publicUrl('site', path) }));
      setStatus({ type: 'success', msg: 'Image uploaded — click Save to apply it.' });
    } catch (err) {
      setStatus({ type: 'error', msg: err.message });
    }
  }

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    const row = {};
    [...FIELDS.map(([k]) => k), 'location', 'founder_photo_url', 'hero_image_url'].forEach((k) => {
      row[k] = (form[k] || '').trim() || null;
    });
    row.updated_at = new Date().toISOString();
    const { error } = await supabase.from('site_settings').update(row).eq('id', 1);
    setBusy(false);
    if (error) return setStatus({ type: 'error', msg: error.message });
    setStatus({ type: 'success', msg: 'Settings saved.' });
    reload();
  }

  return (
    <div>
      <h2>Site settings</h2>
      <form className="form-card" onSubmit={save} style={{ maxWidth: 760 }}>
        <div className="form-row">
          {FIELDS.map(([k, label, type, ph]) => (
            <div key={k}>
              <label>{label}</label>
              <input type={type} placeholder={ph} value={form[k] || ''} onChange={set(k)} />
            </div>
          ))}
        </div>
        <label>Location (shown on Contact page)</label>
        <input type="text" placeholder="e.g. Ibadan, Nigeria" value={form.location || ''} onChange={set('location')} />

        <label>Home page hero photo</label>
        <div className="upload-row">
          {form.hero_image_url && <img src={form.hero_image_url} alt="" />}
          <input type="file" accept="image/*" onChange={(e) => uploadImage('hero_image_url', e.target.files?.[0], 2200)} />
        </div>

        <label>Lead facilitator photo</label>
        <div className="upload-row">
          {form.founder_photo_url && <img src={form.founder_photo_url} alt="" />}
          <input type="file" accept="image/*" onChange={(e) => uploadImage('founder_photo_url', e.target.files?.[0], 900)} />
        </div>


        <div className="form-actions">
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</button>
        </div>
        <Status status={status} />
      </form>
    </div>
  );
}
