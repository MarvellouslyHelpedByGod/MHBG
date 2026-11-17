import { useCallback, useEffect, useState } from 'react';
import Status from '../../components/Status.jsx';
import { publicUrl, supabase, uploadFile } from '../../lib/supabase.js';
import { formatDate } from '../../lib/utils.js';

const blank = { title: '', published_on: '', summary: '', link_url: '', is_published: true };

export default function PublicationsAdmin() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(blank);
  const [file, setFile] = useState(null);
  const [editing, setEditing] = useState(null);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from('publications').select('*').order('published_on', { ascending: false, nullsFirst: false });
    setRows(data || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  function edit(p) {
    setEditing(p);
    setFile(null);
    setForm({ title: p.title, published_on: p.published_on || '', summary: p.summary || '', link_url: p.link_url || '', is_published: p.is_published });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function reset() {
    setEditing(null);
    setForm(blank);
    setFile(null);
  }

  async function save(e) {
    e.preventDefault();
    if (!form.title.trim()) return setStatus({ type: 'error', msg: 'Add a title.' });
    setBusy(true);
    setStatus(null);
    try {
      const row = {
        title: form.title.trim(),
        published_on: form.published_on || null,
        summary: form.summary.trim() || null,
        link_url: form.link_url.trim() || null,
        is_published: form.is_published,
      };
      if (file) row.file_path = await uploadFile('publications', file);
      const { error } = editing
        ? await supabase.from('publications').update(row).eq('id', editing.id)
        : await supabase.from('publications').insert(row);
      if (error) throw error;
      if (file && editing?.file_path) await supabase.storage.from('publications').remove([editing.file_path]);
      setStatus({ type: 'success', msg: editing ? 'Publication updated.' : 'Publication added.' });
      reset();
      load();
    } catch (err) {
      setStatus({ type: 'error', msg: err.message });
    }
    setBusy(false);
  }

  async function remove(p) {
    if (!confirm(`Delete "${p.title}"?`)) return;
    if (p.file_path) await supabase.storage.from('publications').remove([p.file_path]);
    await supabase.from('publications').delete().eq('id', p.id);
    load();
  }

  return (
    <div>
      <h2>Publications</h2>
      <form className="mini-form" onSubmit={save} style={{ marginTop: 0, marginBottom: '2rem', maxWidth: 640 }}>
        <strong>{editing ? `Editing: ${editing.title}` : 'Add a publication'}</strong>
        <input type="text" placeholder="Title" value={form.title} onChange={set('title')} />
        <input type="date" value={form.published_on} onChange={set('published_on')} />
        <textarea placeholder="Short summary" value={form.summary} onChange={set('summary')} style={{ minHeight: 90 }} />
        <input type="url" placeholder="Link (optional), e.g. a blog post or video" value={form.link_url} onChange={set('link_url')} />
        <label style={{ margin: 0 }}>Or attach a file (PDF, etc.)</label>
        <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        {editing?.file_path && !file && <p className="form-hint">A file is already attached. Choose a new one to replace it.</p>}
        <label className="checkbox"><input type="checkbox" checked={form.is_published} onChange={set('is_published')} /> Show on the website</label>
        <div className="row-actions">
          <button className="btn btn-primary btn-sm" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Add'}</button>
          {editing && <button type="button" className="btn btn-outline-dark btn-sm" onClick={reset}>Cancel</button>}
        </div>
        <Status status={status} />
      </form>

      {rows.length === 0 ? (
        <div className="empty-state">No publications yet.</div>
      ) : (
        <div className="table-scroll">
          <table className="admin-table">
            <thead><tr><th>Title</th><th>Date</th><th>Attachment</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td><strong>{p.title}</strong>{p.summary && <div style={{ color: 'var(--ink-soft)', fontSize: '.85rem' }}>{p.summary}</div>}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatDate(p.published_on)}</td>
                  <td>
                    {p.file_path ? <a href={publicUrl('publications', p.file_path)} target="_blank" rel="noreferrer">File</a> : p.link_url ? <a href={p.link_url} target="_blank" rel="noreferrer">Link</a> : '—'}
                  </td>
                  <td><span className={`pill ${p.is_published ? 'approved' : 'pending'}`}>{p.is_published ? 'Live' : 'Hidden'}</span></td>
                  <td>
                    <div className="row-actions">
                      <button className="btn-plain" onClick={() => edit(p)}>Edit</button>
                      <button className="btn-delete" onClick={() => remove(p)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
