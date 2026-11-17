import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase.js';
import { formatDateTime } from '../../lib/utils.js';

export default function TestimoniesAdmin() {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [openId, setOpenId] = useState(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from('testimonies').select('*').eq('status', filter).order('created_at', { ascending: false });
    setRows(data || []);
  }, [filter]);

  useEffect(() => {
    load();
    const ch = supabase
      .channel('admin-testimonies')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'testimonies' }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  async function setStatus(t, status) {
    const { error } = await supabase
      .from('testimonies')
      .update({ status, approved_at: status === 'approved' ? new Date().toISOString() : null })
      .eq('id', t.id);
    if (error) alert(error.message);
    else load();
  }

  async function remove(t) {
    if (!confirm(`Delete "${t.title}" permanently?`)) return;
    const { error } = await supabase.from('testimonies').delete().eq('id', t.id);
    if (error) alert(error.message);
    else load();
  }

  return (
    <div>
      <div className="section-head">
        <h2>Testimonies</h2>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ width: 'auto' }}>
          <option value="pending">Waiting for review</option>
          <option value="approved">Published</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>
      {rows.length === 0 ? (
        <div className="empty-state">Nothing here.</div>
      ) : (
        <div className="table-scroll">
          <table className="admin-table">
            <thead><tr><th>Testimony</th><th>From</th><th>Received</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id}>
                  <td style={{ maxWidth: 460 }}>
                    <strong>{t.title}</strong>
                    <div style={{ color: 'var(--ink-soft)', whiteSpace: 'pre-wrap' }}>
                      {openId === t.id || t.body.length <= 220 ? t.body : t.body.slice(0, 220) + '…'}
                    </div>
                    {t.body.length > 220 && (
                      <button className="btn-plain" style={{ marginTop: '.4rem', border: 0, background: 'none', color: 'var(--green-deep)', cursor: 'pointer', padding: 0, fontWeight: 600 }} onClick={() => setOpenId(openId === t.id ? null : t.id)}>
                        {openId === t.id ? 'Show less' : 'Read all'}
                      </button>
                    )}
                  </td>
                  <td>{t.name}{t.location && <div style={{ color: 'var(--ink-soft)', fontSize: '.85rem' }}>{t.location}</div>}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatDateTime(t.created_at)}</td>
                  <td><span className={`pill ${t.status}`}>{t.status === 'approved' ? 'Published' : t.status === 'pending' ? 'Pending' : 'Rejected'}</span></td>
                  <td>
                    <div className="row-actions">
                      {t.status !== 'approved' && <button className="btn-approve" onClick={() => setStatus(t, 'approved')}>Approve</button>}
                      {t.status !== 'rejected' && <button className="btn-reject" onClick={() => setStatus(t, 'rejected')}>{t.status === 'approved' ? 'Unpublish' : 'Reject'}</button>}
                      <button className="btn-delete" onClick={() => remove(t)}>Delete</button>
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
