import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSite } from '../../lib/SiteContext.jsx';
import { fetchAll, supabase } from '../../lib/supabase.js';
import { printTag } from '../../lib/tags.js';
import { downloadCsv, formatDateTime } from '../../lib/utils.js';

export default function Registrations() {
  const { conference } = useSite();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [flash, setFlash] = useState(new Set());
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const confId = conference?.id;
  const flashTimers = useRef([]);

  const load = useCallback(async () => {
    if (!confId) return;
    setLoading(true);
    try {
      const data = await fetchAll(() =>
        supabase.from('registrations').select('*').eq('conference_id', confId).order('created_at', { ascending: false })
      );
      setRows(data);
    } finally {
      setLoading(false);
    }
  }, [confId]);

  useEffect(() => {
    if (!confId) {
      setLoading(false);
      return;
    }
    load();
    const ch = supabase
      .channel(`registrations-${confId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'registrations' },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setRows((r) => r.filter((x) => x.id !== payload.old.id));
            return;
          }
          const row = payload.new;
          if (row.conference_id !== confId) return;
          if (payload.eventType === 'INSERT') {
            setRows((r) => [row, ...r.filter((x) => x.id !== row.id)]);
            setFlash((f) => new Set(f).add(row.id));
            flashTimers.current.push(
              setTimeout(() => setFlash((f) => { const n = new Set(f); n.delete(row.id); return n; }), 2700)
            );
          } else {
            setRows((r) => r.map((x) => (x.id === row.id ? row : x)));
          }
        }
      )
      .subscribe((s) => setLive(s === 'SUBSCRIBED'));
    return () => {
      supabase.removeChannel(ch);
      flashTimers.current.forEach(clearTimeout);
    };
  }, [confId, load]);

  const stats = useMemo(() => {
    const present = rows.filter((r) => r.checked_in_at).length;
    return {
      total: rows.length,
      present,
      absent: rows.length - present,
      printed: rows.filter((r) => r.tag_printed_at).length,
      walkIns: rows.filter((r) => r.source === 'walk_in').length,
    };
  }, [rows]);

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === 'present' && !r.checked_in_at) return false;
      if (filter === 'absent' && r.checked_in_at) return false;
      if (filter === 'walk_in' && r.source !== 'walk_in') return false;
      if (!term) return true;
      return [r.full_name, r.phone, r.email, r.code, r.organisation].some((v) => v && v.toLowerCase().includes(term));
    });
  }, [rows, q, filter]);

  async function toggleCheckIn(r) {
    const { error } = await supabase
      .from('registrations')
      .update({ checked_in_at: r.checked_in_at ? null : new Date().toISOString() })
      .eq('id', r.id);
    if (error) alert(error.message);
  }

  async function print(r) {
    await printTag(r, conference);
    await supabase.rpc('mark_tag_printed', { p_id: r.id });
  }

  async function remove(r) {
    if (!confirm(`Delete the registration for ${r.full_name}? This cannot be undone.`)) return;
    const { error } = await supabase.from('registrations').delete().eq('id', r.id);
    if (error) alert(error.message);
    else setRows((x) => x.filter((y) => y.id !== r.id));
  }

  function exportCsv() {
    downloadCsv(`registrations-${new Date().toISOString().slice(0, 10)}.csv`, visible, [
      { label: 'Name', value: (r) => r.full_name },
      { label: 'Phone', value: (r) => r.phone },
      { label: 'Email', value: (r) => r.email },
      { label: 'Organisation', value: (r) => r.organisation },
      { label: 'Category', value: (r) => r.category },
      { label: 'Code', value: (r) => r.code },
      { label: 'Source', value: (r) => (r.source === 'walk_in' ? 'Walk-in' : 'Online') },
      { label: 'Registered', value: (r) => r.created_at },
      { label: 'Checked in', value: (r) => r.checked_in_at || '' },
      { label: 'Tag printed', value: (r) => r.tag_printed_at || '' },
    ]);
  }

  if (!conference) {
    return (
      <div className="notice">
        There's no active conference yet. <Link to="/admin/conference">Set one up</Link> to start taking registrations.
      </div>
    );
  }

  return (
    <div>
      <div className="section-head">
        <div>
          <h2>{conference.title}</h2>
          <span className={`live-dot${live ? '' : ' off'}`}>{live ? 'Live — new registrations appear instantly' : 'Connecting…'}</span>
        </div>
        <Link to="/admin/check-in" className="btn btn-primary">Open check-in</Link>
      </div>

      <div className="stat-row">
        <div className="stat"><span className="n">{stats.total}</span><span className="l">Registered</span></div>
        <div className="stat"><span className="n">{stats.present}</span><span className="l">Checked in</span></div>
        <div className="stat"><span className="n">{stats.absent}</span><span className="l">Not yet arrived</span></div>
        <div className="stat"><span className="n">{stats.printed}</span><span className="l">Tags printed</span></div>
        <div className="stat"><span className="n">{stats.walkIns}</span><span className="l">Walk-ins</span></div>
      </div>

      <div className="toolbar">
        <input type="search" placeholder="Search name, phone, email or code" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ flex: '0 1 200px' }}>
          <option value="all">Everyone</option>
          <option value="present">Checked in</option>
          <option value="absent">Not yet arrived</option>
          <option value="walk_in">Walk-ins</option>
        </select>
        <button className="btn btn-outline-dark btn-sm" onClick={exportCsv}>Export CSV</button>
      </div>

      <div className="table-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th><th>Contact</th><th>Category</th><th>Code</th><th>Status</th><th>Registered</th><th></th>
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 ? (
              <tr><td colSpan={7}>Loading…</td></tr>
            ) : visible.length === 0 ? (
              <tr><td colSpan={7}>No registrations match.</td></tr>
            ) : (
              visible.map((r) => (
                <tr key={r.id} className={flash.has(r.id) ? 'row-new' : ''}>
                  <td>
                    <strong>{r.full_name}</strong>
                    {r.organisation && <div style={{ color: 'var(--ink-soft)', fontSize: '.85rem' }}>{r.organisation}</div>}
                  </td>
                  <td>
                    {r.phone}
                    {r.email && <div style={{ color: 'var(--ink-soft)', fontSize: '.85rem' }}>{r.email}</div>}
                  </td>
                  <td>{r.category}</td>
                  <td className="mono">{r.code}</td>
                  <td>
                    {r.checked_in_at ? (
                      <span className="pill approved" title={formatDateTime(r.checked_in_at)}>Present</span>
                    ) : (
                      <span className="pill pending">Not arrived</span>
                    )}{' '}
                    {r.source === 'walk_in' && <span className="pill walkin">Walk-in</span>}
                    {r.tag_printed_at && <div style={{ fontSize: '.78rem', color: 'var(--ink-soft)', marginTop: '.3rem' }}>Tag printed</div>}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatDateTime(r.created_at)}</td>
                  <td>
                    <div className="row-actions">
                      <button className={r.checked_in_at ? 'btn-plain' : 'btn-approve'} onClick={() => toggleCheckIn(r)}>
                        {r.checked_in_at ? 'Undo' : 'Check in'}
                      </button>
                      <button className="btn-plain" onClick={() => print(r)}>Print tag</button>
                      <button className="btn-delete" onClick={() => remove(r)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
