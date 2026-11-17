import { useEffect, useState } from 'react';
import { NavLink, Navigate, useParams } from 'react-router-dom';
import Status from '../components/Status.jsx';
import { supabase } from '../lib/supabase.js';
import Registrations from './admin/Registrations.jsx';
import CheckIn from './admin/CheckIn.jsx';
import Tags from './admin/Tags.jsx';
import ConferenceSettings from './admin/ConferenceSettings.jsx';
import TestimoniesAdmin from './admin/TestimoniesAdmin.jsx';
import GalleryAdmin from './admin/GalleryAdmin.jsx';
import PublicationsAdmin from './admin/PublicationsAdmin.jsx';
import Messages from './admin/Messages.jsx';
import SiteSettings from './admin/SiteSettings.jsx';
import Team, { ROLES } from './admin/Team.jsx';

const FULL = ['super_admin', 'admin'];
const ALL = ['super_admin', 'admin', 'checkin'];

// [path, label, component, roles that can see it]
const TABS = [
  ['registrations', 'Registrations', Registrations, FULL],
  ['check-in', 'Check-in', CheckIn, ALL],
  ['tags', 'Tags', Tags, FULL],
  ['conference', 'Conference', ConferenceSettings, FULL],
  ['testimonies', 'Testimonies', TestimoniesAdmin, FULL],
  ['gallery', 'Gallery', GalleryAdmin, FULL],
  ['publications', 'Publications', PublicationsAdmin, FULL],
  ['messages', 'Messages', Messages, FULL],
  ['settings', 'Site settings', SiteSettings, FULL],
  ['team', 'Team', Team, ['super_admin']],
];

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setStatus(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setStatus({ type: 'error', msg: 'Incorrect email or password.' });
  }

  return (
    <section className="section-dew">
      <div className="wrap lock-screen">
        <form className="form-card" onSubmit={submit} style={{ width: '100%', maxWidth: 420 }}>
          <p className="kicker">Admin</p>
          <h2>Sign in</h2>
          <label htmlFor="a-email">Email</label>
          <input id="a-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
          <label htmlFor="a-pass">Password</label>
          <input id="a-pass" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <div className="form-actions">
            <button className="btn btn-primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
          </div>
          <Status status={status} />
        </form>
      </div>
    </section>
  );
}

export default function Admin() {
  const { tab } = useParams();
  const [session, setSession] = useState(undefined);
  // undefined = checking, null = not on the team, otherwise the role
  const [role, setRole] = useState(undefined);
  const [counts, setCounts] = useState({ testimonies: 0, messages: 0 });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const userId = session?.user?.id;
  useEffect(() => {
    if (!userId) {
      setRole(undefined);
      return;
    }
    setRole(undefined);
    supabase.rpc('my_role').then(({ data, error }) => {
      // Before update.sql has been run, fall back to the old admin check
      if (error) supabase.rpc('is_admin').then((r) => setRole(r.data ? 'admin' : null));
      else setRole(data || null);
    });
  }, [userId]);

  const isFullAdmin = FULL.includes(role);

  // Badges for things waiting on the team
  useEffect(() => {
    if (!isFullAdmin) return;
    const load = async () => {
      const [t, m] = await Promise.all([
        supabase.from('testimonies').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('messages').select('id', { count: 'exact', head: true }).eq('is_read', false),
      ]);
      setCounts({ testimonies: t.count || 0, messages: m.count || 0 });
    };
    load();
    const ch = supabase
      .channel('admin-badges')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'testimonies' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [isFullAdmin]);

  if (session === undefined) return null;
  if (!session) return <Login />;
  if (role === undefined) return null;

  if (!role) {
    return (
      <section className="section-dew">
        <div className="wrap lock-screen">
          <div className="form-card">
            <h2>No admin access</h2>
            <p>You're signed in as {session.user.email}, but this account hasn't been given admin access.</p>
            <button className="btn btn-outline-dark" onClick={() => supabase.auth.signOut()}>Sign out</button>
          </div>
        </div>
      </section>
    );
  }

  const myTabs = TABS.filter(([, , , roles]) => roles.includes(role));
  const current = myTabs.find(([key]) => key === tab);
  if (!current) return <Navigate to={`/admin/${myTabs[0][0]}`} replace />;
  const [, , Component] = current;

  return (
    <>
      <section className="page-hero admin-hero">
        <div className="wrap">
          <div className="section-head" style={{ marginBottom: 0 }}>
            <div>
              <p className="kicker">Admin</p>
              <h1>Dashboard</h1>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: '0 0 .5rem', fontSize: '.85rem' }}>
                {session.user.email} · {ROLES[role]?.label || role}
              </p>
              <button className="btn btn-outline btn-sm" onClick={() => supabase.auth.signOut()}>Sign out</button>
            </div>
          </div>
          <nav className="admin-tabs" aria-label="Admin sections">
            {myTabs.map(([key, label]) => (
              <NavLink key={key} to={`/admin/${key}`} className={({ isActive }) => (isActive ? 'current' : '')}>
                {label}
                {key === 'testimonies' && counts.testimonies > 0 && <span className="badge">{counts.testimonies}</span>}
                {key === 'messages' && counts.messages > 0 && <span className="badge">{counts.messages}</span>}
              </NavLink>
            ))}
          </nav>
        </div>
      </section>
      <section className="section-dew admin-body">
        <div className="wrap">
          <Component me={userId} role={role} />
        </div>
      </section>
    </>
  );
}
