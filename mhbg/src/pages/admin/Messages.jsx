import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase.js';
import { formatDateTime, whatsappLink } from '../../lib/utils.js';

export default function Messages() {
  const [rows, setRows] = useState([]);

  const load = useCallback(async () => {
    const { data } = await supabase.from('messages').select('*').order('created_at', { ascending: false }).limit(300);
    setRows(data || []);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase
      .channel('admin-messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  async function markRead(m, is_read = true) {
    await supabase.from('messages').update({ is_read }).eq('id', m.id);
    load();
  }

  async function remove(m) {
    if (!confirm(`Delete the message from ${m.name}?`)) return;
    await supabase.from('messages').delete().eq('id', m.id);
    load();
  }

  return (
    <div>
      <h2>Messages</h2>
      {rows.length === 0 ? (
        <div className="empty-state">No messages yet.</div>
      ) : (
        rows.map((m) => {
          const wa = whatsappLink(m.phone, `Hello ${m.name.split(' ')[0]}, thank you for reaching out to Marvellously Helped by God.`);
          return (
            <div className={`msg${m.is_read ? '' : ' unread'}`} key={m.id}>
              <div className="meta">
                <strong style={{ color: 'var(--ink)' }}>{m.name}</strong>
                {m.email && ` · ${m.email}`}
                {m.phone && ` · ${m.phone}`} · {formatDateTime(m.created_at)}
              </div>
              {m.kind === 'prayer' && <span className="pill pending" style={{ marginBottom: '.5rem', display: 'inline-block' }}>Prayer request</span>}
              {m.subject && m.kind !== 'prayer' && <h3 style={{ fontSize: '1.15rem' }}>{m.subject}</h3>}
              <p>{m.body}</p>
              <div className="row-actions">
                {m.email && (
                  <a className="btn btn-outline-dark btn-sm" href={`mailto:${m.email}?subject=${encodeURIComponent('Re: ' + (m.subject || 'Your message'))}`} onClick={() => markRead(m)}>
                    Reply by email
                  </a>
                )}
                {wa && (
                  <a className="btn btn-whatsapp btn-sm" href={wa} target="_blank" rel="noreferrer" onClick={() => markRead(m)}>
                    Reply on WhatsApp
                  </a>
                )}
                <button className="btn-plain" onClick={() => markRead(m, !m.is_read)}>{m.is_read ? 'Mark unread' : 'Mark read'}</button>
                <button className="btn-delete" onClick={() => remove(m)}>Delete</button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
