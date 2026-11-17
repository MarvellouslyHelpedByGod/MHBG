import { useCallback, useEffect, useState } from 'react';
import Status from '../../components/Status.jsx';
import { supabase } from '../../lib/supabase.js';
import { formatDateTime } from '../../lib/utils.js';

export const ROLES = {
  super_admin: { label: 'Super admin', hint: 'Everything, plus adding and removing team members.' },
  admin: { label: 'Admin', hint: 'Everything except managing the team.' },
  checkin: { label: 'Check-in volunteer', hint: 'Only the Check-in screen: scan, voucher codes, search, walk-ins and printing.' },
};

/** Call the server-side function that holds the Supabase service key. */
async function staffApi(payload) {
  const { data } = await supabase.auth.getSession();
  let res;
  try {
    res = await fetch('/api/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token || ''}` },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error('Could not reach the server. Check your internet connection.');
  }
  const body = await res.json().catch(() => null);
  if (!body) {
    throw new Error(
      'Creating logins, resetting passwords and deleting accounts only work on the live (Vercel) site. ' +
        'On localhost, create the user in Supabase → Authentication, then add them here without a password.'
    );
  }
  if (!res.ok) throw new Error(body.error || 'Something went wrong.');
  return body;
}

function makePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

const blank = { email: '', role: 'checkin', password: '' };

export default function Team({ me }) {
  const [rows, setRows] = useState(null);
  const [form, setForm] = useState(blank);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('list_staff');
    if (error) setStatus({ type: 'error', msg: error.message });
    setRows(data || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function add(e) {
    e.preventDefault();
    setStatus(null);
    setCreated(null);
    const email = form.email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setStatus({ type: 'error', msg: 'Enter a valid email address.' });
    if (form.password && form.password.length < 8) {
      return setStatus({ type: 'error', msg: 'The password must be at least 8 characters.' });
    }
    setBusy(true);
    try {
      let existing = true;
      if (form.password) ({ existing } = await staffApi({ action: 'create', email, password: form.password }));
      const { error } = await supabase.rpc('add_staff_by_email', { p_email: email, p_role: form.role });
      if (error) throw error;
      if (form.password && !existing) setCreated({ email, password: form.password });
      setStatus({
        type: 'success',
        msg: form.password && existing
          ? `${email} already had an account, so their password was not changed. They're now ${ROLES[form.role].label}.`
          : `${email} added as ${ROLES[form.role].label}.`,
      });
      setForm(blank);
      load();
    } catch (err) {
      setStatus({ type: 'error', msg: err.message });
    }
    setBusy(false);
  }

  async function changeRole(r, role) {
    setStatus(null);
    const { error } = await supabase.rpc('set_staff_role', { p_user_id: r.user_id, p_role: role });
    if (error) setStatus({ type: 'error', msg: error.message });
    load();
  }

  async function removeAccess(r) {
    if (!confirm(`Remove ${r.email} from the team? Their login stays, but it won't open the admin any more.`)) return;
    const { error } = await supabase.rpc('remove_staff', { p_user_id: r.user_id });
    setStatus(error ? { type: 'error', msg: error.message } : { type: 'success', msg: `${r.email} removed from the team.` });
    load();
  }

  async function deleteAccount(r) {
    if (!confirm(`Delete ${r.email}'s account completely? This cannot be undone.`)) return;
    try {
      await staffApi({ action: 'delete', user_id: r.user_id });
      setStatus({ type: 'success', msg: `${r.email}'s account was deleted.` });
    } catch (err) {
      setStatus({ type: 'error', msg: err.message });
    }
    load();
  }

  async function resetPassword(r) {
    const password = prompt(`New password for ${r.email} (at least 8 characters):`, makePassword());
    if (password == null) return;
    try {
      await staffApi({ action: 'password', user_id: r.user_id, password });
      setCreated({ email: r.email, password });
      setStatus({ type: 'success', msg: `Password changed for ${r.email}.` });
    } catch (err) {
      setStatus({ type: 'error', msg: err.message });
    }
  }

  const shareText = created
    ? `Your MHBG admin login\nSite: ${window.location.origin}/admin\nEmail: ${created.email}\nPassword: ${created.password}`
    : '';

  return (
    <div>
      <h2>Team</h2>
      <p style={{ color: 'var(--ink-soft)', maxWidth: '70ch' }}>
        Give each person their own login so you can see who checked people in, and remove access after the event.
      </p>

      <div className="settings-grid" style={{ marginBottom: '1.6rem' }}>
        <form className="mini-form" onSubmit={add} style={{ marginTop: 0, maxWidth: 'none' }}>
          <strong>Add a team member</strong>
          <input type="email" placeholder="Their email" autoComplete="off" value={form.email} onChange={set('email')} />
          <select value={form.role} onChange={set('role')}>
            {Object.entries(ROLES).map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}
          </select>
          <p className="form-hint" style={{ margin: 0 }}>{ROLES[form.role].hint}</p>
          <div style={{ display: 'flex', gap: '.5rem' }}>
            <input type="text" placeholder="Password for a new login" autoComplete="new-password" value={form.password} onChange={set('password')} />
            <button type="button" className="btn btn-outline-dark btn-sm" onClick={() => setForm((f) => ({ ...f, password: makePassword() }))}>
              Generate
            </button>
          </div>
          <p className="form-hint" style={{ margin: 0 }}>Leave the password empty if they already have a login.</p>
          <div><button className="btn btn-primary btn-sm" disabled={busy}>{busy ? 'Adding…' : 'Add to team'}</button></div>
        </form>

        <div>
          {Object.entries(ROLES).map(([k, r]) => (
            <p key={k} style={{ fontSize: '.92rem' }}><strong>{r.label}:</strong> {r.hint}</p>
          ))}
        </div>
      </div>

      <Status status={status} />

      {created && (
        <div className="result ok" style={{ marginBottom: '1.6rem' }}>
          <div className="label">Login details to send</div>
          <p style={{ whiteSpace: 'pre-line', color: 'var(--ink)', fontFamily: 'ui-monospace, Menlo, Consolas, monospace', fontSize: '.9rem' }}>
            {shareText}
          </p>
          <div className="row-actions">
            <a className="btn btn-whatsapp btn-sm" href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noreferrer">
              Send on WhatsApp
            </a>
            <button className="btn btn-outline-dark btn-sm" onClick={() => navigator.clipboard?.writeText(shareText)}>Copy</button>
          </div>
        </div>
      )}

      <div className="table-scroll" style={{ marginTop: '1rem' }}>
        <table className="admin-table">
          <thead><tr><th>Email</th><th>Role</th><th>Last signed in</th><th></th></tr></thead>
          <tbody>
            {rows === null ? (
              <tr><td colSpan={4}>Loading…</td></tr>
            ) : (
              rows.map((r) => {
                const isMe = r.user_id === me;
                return (
                  <tr key={r.user_id}>
                    <td>{r.email}{isMe && <span className="pill approved" style={{ marginLeft: '.5rem' }}>You</span>}</td>
                    <td>
                      <select value={r.role} disabled={isMe} onChange={(e) => changeRole(r, e.target.value)} style={{ width: 'auto' }}>
                        {Object.entries(ROLES).map(([k, x]) => <option key={k} value={k}>{x.label}</option>)}
                      </select>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>{r.last_sign_in_at ? formatDateTime(r.last_sign_in_at) : 'Never'}</td>
                    <td>
                      <div className="row-actions">
                        <button className="btn-plain" onClick={() => resetPassword(r)}>Reset password</button>
                        {!isMe && <button className="btn-reject" onClick={() => removeAccess(r)}>Remove access</button>}
                        {!isMe && r.role !== 'super_admin' && (
                          <button className="btn-delete" onClick={() => deleteAccount(r)}>Delete account</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
