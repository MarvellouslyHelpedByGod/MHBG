import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Status from '../../components/Status.jsx';
import { useSite } from '../../lib/SiteContext.jsx';
import { publicUrl, supabase, uploadFile } from '../../lib/supabase.js';
import { printTag, slipHtml, tagSettings } from '../../lib/tags.js';

const PRESETS = [
  ['90 × 40 mm', 90, 40],
  ['89 × 36 mm (Dymo large address)', 89, 36],
  ['62 × 29 mm (Brother DK-11209)', 62, 29],
  ['100 × 50 mm', 100, 50],
  ['A6 sheet (148 × 105 mm)', 148, 105],
];

const SAMPLE = { full_name: 'Adaeze Okonkwo', category: 'Participant', organisation: 'Grace Assembly, Enugu', code: 'MH-7K2QPA' };

export default function Tags() {
  const { conference, reload } = useSite();
  const [t, setT] = useState(() => tagSettings(conference));
  const [preview, setPreview] = useState('');
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => setT(tagSettings(conference)), [conference]);

  useEffect(() => {
    let alive = true;
    slipHtml(SAMPLE, conference, t).then((h) => alive && setPreview(h));
    return () => { alive = false; };
  }, [t, conference]);

  if (!conference) {
    return <div className="notice">Set up the conference first. <Link to="/admin/conference">Go to Conference</Link></div>;
  }

  const set = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.type === 'number' ? Number(e.target.value) : e.target.value;
    setT((x) => ({ ...x, [k]: v }));
  };

  async function uploadBackground(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const path = await uploadFile('site', file);
      setT((x) => ({ ...x, background_url: publicUrl('site', path) }));
    } catch (err) {
      setStatus({ type: 'error', msg: err.message });
    }
  }

  async function save() {
    setBusy(true);
    const { error } = await supabase.from('conferences').update({ tag_settings: t }).eq('id', conference.id);
    setBusy(false);
    if (error) return setStatus({ type: 'error', msg: error.message });
    setStatus({ type: 'success', msg: 'Tag design saved.' });
    reload();
  }

  const px = 3.78; // mm to CSS px
  const scale = Math.min(1, 460 / (t.width_mm * px));

  return (
    <div>
      <h2>Tag slips</h2>
      <p style={{ color: 'var(--ink-soft)', maxWidth: '70ch' }}>
        Pre-made tags are prepared in advance with no names on them. At check-in, a sticky slip with the person's details
        prints for each arrival and is pasted onto a tag, so nothing is printed for people who don't come. Set the size
        to match your label rolls.
      </p>

      <div className="settings-grid">
        <div className="mini-form" style={{ marginTop: 0, maxWidth: 'none' }}>
          <label style={{ margin: 0 }}>Label size</label>
          <select
            value={PRESETS.findIndex(([, w, h]) => w === t.width_mm && h === t.height_mm)}
            onChange={(e) => {
              const p = PRESETS[Number(e.target.value)];
              if (p) setT((x) => ({ ...x, width_mm: p[1], height_mm: p[2] }));
            }}
          >
            <option value={-1}>Custom</option>
            {PRESETS.map(([label], i) => <option key={label} value={i}>{label}</option>)}
          </select>
          <div className="form-row">
            <div><label>Width (mm)</label><input type="number" min="30" max="210" value={t.width_mm} onChange={set('width_mm')} /></div>
            <div><label>Height (mm)</label><input type="number" min="15" max="297" value={t.height_mm} onChange={set('height_mm')} /></div>
          </div>
          <label>Small heading on slip (optional)</label>
          <input type="text" placeholder="e.g. MHBG Conference 2026" value={t.header_text} onChange={set('header_text')} />
          <div className="form-row">
            <div><label>Name size (pt)</label><input type="number" min="10" max="48" value={t.name_size_pt} onChange={set('name_size_pt')} /></div>
            <div>
              <label>Alignment</label>
              <select value={t.align} onChange={set('align')}>
                <option value="center">Centred</option>
                <option value="left">Left</option>
              </select>
            </div>
          </div>
          <label>Show on slip</label>
          <label className="checkbox"><input type="checkbox" checked={t.show_name} onChange={set('show_name')} /> Name</label>
          <label className="checkbox"><input type="checkbox" checked={t.show_category} onChange={set('show_category')} /> Category (Participant, Volunteer…)</label>
          <label className="checkbox"><input type="checkbox" checked={t.show_organisation} onChange={set('show_organisation')} /> Church / organisation</label>
          <label className="checkbox"><input type="checkbox" checked={t.show_code} onChange={set('show_code')} /> Voucher code</label>
          <label className="checkbox"><input type="checkbox" checked={t.show_qr} onChange={set('show_qr')} /> QR code</label>
          <label>Text colour</label>
          <input type="color" value={t.text_color} onChange={set('text_color')} style={{ width: 60, height: 36, padding: 2 }} />
          <label>Background design (optional)</label>
          <div className="upload-row">
            <input type="file" accept="image/*" onChange={uploadBackground} />
            {t.background_url && (
              <button className="btn btn-outline-dark btn-sm" type="button" onClick={() => setT((x) => ({ ...x, background_url: '' }))}>Remove</button>
            )}
          </div>
          <p className="form-hint">Upload your designed slip artwork; names print on top of it.</p>
          <p className="form-hint" style={{ marginTop: '1rem' }}>
            Which phone or laptop prints is chosen on each device, under Check-in → “Printing on this device”.
          </p>
          <div className="row-actions" style={{ marginTop: '.8rem' }}>
            <button className="btn btn-primary btn-sm" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save tag design'}</button>
            <button className="btn btn-outline-dark btn-sm" type="button" onClick={() => printTag(SAMPLE, { ...conference, tag_settings: t })}>Test print</button>
          </div>
          <Status status={status} />
        </div>

        <div>
          <label style={{ marginTop: 0 }}>Preview (sample name)</label>
          <div className="slip-preview">
            <div style={{ width: t.width_mm * px * scale, height: t.height_mm * px * scale }}>
              <iframe
                title="Tag preview"
                srcDoc={preview}
                style={{ width: t.width_mm * px, height: t.height_mm * px, transform: `scale(${scale})`, transformOrigin: '0 0' }}
              />
            </div>
          </div>
          <p className="form-hint">
            In the print dialog, choose your label printer, set margins to “None” and scale to 100%. Label printers
            (Brother QL, Dymo, Xprinter) work well; a normal printer with sticker sheets works too.
          </p>
        </div>
      </div>
    </div>
  );
}
