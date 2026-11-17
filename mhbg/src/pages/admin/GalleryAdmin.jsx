import { useCallback, useEffect, useState } from 'react';
import Status from '../../components/Status.jsx';
import { publicUrl, supabase, uploadFile } from '../../lib/supabase.js';
import { resizeImage } from '../../lib/utils.js';

const IG_RE = /^https?:\/\/(www\.)?instagram\.com\/(p|reel|tv)\/[A-Za-z0-9_-]+\/?/;

export default function GalleryAdmin() {
  const [items, setItems] = useState([]);
  const [caption, setCaption] = useState('');
  const [igUrl, setIgUrl] = useState('');
  const [progress, setProgress] = useState(null);
  const [status, setStatus] = useState(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('gallery_items')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });
    setItems(data || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function upload(e) {
    const files = [...(e.target.files || [])];
    e.target.value = '';
    if (!files.length) return;
    setStatus(null);
    let done = 0;
    setProgress(`Uploading 0 of ${files.length}…`);
    try {
      for (const file of files) {
        const { blob, width, height } = await resizeImage(file);
        const path = await uploadFile('gallery', blob, 'jpg');
        const { error } = await supabase.from('gallery_items').insert({ image_path: path, caption: caption.trim() || null, width, height });
        if (error) throw error;
        done += 1;
        setProgress(`Uploading ${done} of ${files.length}…`);
      }
      setStatus({ type: 'success', msg: `${done} photo${done === 1 ? '' : 's'} added.` });
      setCaption('');
    } catch (err) {
      setStatus({ type: 'error', msg: `Stopped after ${done}: ${err.message}` });
    }
    setProgress(null);
    load();
  }

  async function addInstagram(e) {
    e.preventDefault();
    const m = igUrl.trim().match(IG_RE);
    if (!m) {
      setStatus({ type: 'error', msg: 'Paste an Instagram post or reel link, e.g. https://www.instagram.com/p/XXXXXXX/' });
      return;
    }
    const url = m[0].endsWith('/') ? m[0] : m[0] + '/';
    const { error } = await supabase.from('gallery_items').insert({ instagram_url: url, caption: caption.trim() || null });
    if (error) return setStatus({ type: 'error', msg: error.message });
    setIgUrl('');
    setStatus({ type: 'success', msg: 'Instagram post added — it embeds live on the Gallery page.' });
    load();
  }

  async function saveCaption(item, value) {
    if ((item.caption || '') === value) return;
    await supabase.from('gallery_items').update({ caption: value.trim() || null }).eq('id', item.id);
  }

  async function remove(item) {
    if (!confirm(item.instagram_url ? 'Remove this Instagram post from the gallery?' : 'Delete this photo?')) return;
    // Uploaded files live in storage; the original event photos ship with the site (paths starting with "/")
    if (item.image_path && !item.image_path.startsWith('/')) {
      await supabase.storage.from('gallery').remove([item.image_path]);
    }
    await supabase.from('gallery_items').delete().eq('id', item.id);
    load();
  }

  return (
    <div>
      <h2>Gallery</h2>
      <div className="settings-grid" style={{ marginBottom: '2rem' }}>
        <div className="mini-form" style={{ marginTop: 0, maxWidth: 'none' }}>
          <strong>Upload photos</strong>
          <input type="text" placeholder="Caption for this batch (optional), e.g. Conference 2026" value={caption} onChange={(e) => setCaption(e.target.value)} />
          <input type="file" accept="image/*" multiple onChange={upload} disabled={Boolean(progress)} />
          <p className="form-hint" style={{ margin: 0 }}>Select many at once. Photos are resized automatically so the page stays fast on mobile data.</p>
          {progress && <div className="form-status success">{progress}</div>}
        </div>
        <form className="mini-form" onSubmit={addInstagram} style={{ marginTop: 0, maxWidth: 'none' }}>
          <strong>Add an Instagram post or reel</strong>
          <input type="url" placeholder="https://www.instagram.com/p/…" value={igUrl} onChange={(e) => setIgUrl(e.target.value)} />
          <div><button className="btn btn-primary btn-sm">Add to gallery</button></div>
        </form>
      </div>
      <Status status={status} />

      {items.length === 0 ? (
        <div className="empty-state">No photos yet.</div>
      ) : (
        <div className="thumb-grid" style={{ marginTop: '1.4rem' }}>
          {items.map((it) => (
            <div className="thumb" key={it.id}>
              {it.instagram_url ? (
                <a className="ig-thumb" href={it.instagram_url} target="_blank" rel="noreferrer">Instagram post</a>
              ) : (
                <img src={publicUrl('gallery', it.image_path)} alt={it.caption || ''} loading="lazy" />
              )}
              <div className="body">
                <input type="text" defaultValue={it.caption || ''} placeholder="Caption" onBlur={(e) => saveCaption(it, e.target.value)} />
                <div className="row-actions"><button className="btn-delete" onClick={() => remove(it)}>Delete</button></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
