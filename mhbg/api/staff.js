// Vercel serverless function: creates/deletes team logins and resets passwords.
// Runs on the server only, so the Supabase service key never reaches the browser.
//
// Needs these environment variables in Vercel:
//   SUPABASE_SERVICE_ROLE_KEY  (Supabase -> Project Settings -> API Keys -> service_role / secret key)
//   VITE_SUPABASE_URL          (already set for the site)
import { createClient } from '@supabase/supabase-js';

const json = (res, status, body) => res.status(status).json(body);

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return json(res, 500, { error: 'The server is missing SUPABASE_SERVICE_ROLE_KEY. Add it in Vercel and redeploy.' });
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  // Who is calling? Must be a signed-in super admin.
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return json(res, 401, { error: 'Please sign in again.' });
  const { data: who, error: whoErr } = await admin.auth.getUser(token);
  if (whoErr || !who?.user) return json(res, 401, { error: 'Your session has expired. Please sign in again.' });

  const { data: me } = await admin.from('admins').select('role').eq('user_id', who.user.id).maybeSingle();
  if (me?.role !== 'super_admin') return json(res, 403, { error: 'Only a super admin can do this.' });

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  } catch {
    return json(res, 400, { error: 'Bad request.' });
  }
  const { action } = body;

  try {
    if (action === 'create') {
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      if (!/^\S+@\S+\.\S+$/.test(email)) return json(res, 400, { error: 'Enter a valid email address.' });
      if (password.length < 8) return json(res, 400, { error: 'The password must be at least 8 characters.' });
      const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
      if (error) {
        // Account already exists: fine, the role is assigned next
        if (error.code === 'email_exists' || /already (been )?registered|already exists/i.test(error.message || '')) {
          return json(res, 200, { ok: true, existing: true });
        }
        return json(res, 400, { error: error.message });
      }
      return json(res, 200, { ok: true, existing: false });
    }

    // The remaining actions act on an existing team member
    const userId = String(body.user_id || '');
    if (!userId) return json(res, 400, { error: 'Missing user.' });
    const { data: target } = await admin.from('admins').select('role').eq('user_id', userId).maybeSingle();
    if (!target) return json(res, 404, { error: 'That person is not on the team.' });

    if (action === 'password') {
      const password = String(body.password || '');
      if (password.length < 8) return json(res, 400, { error: 'The password must be at least 8 characters.' });
      const { error } = await admin.auth.admin.updateUserById(userId, { password });
      if (error) return json(res, 400, { error: error.message });
      return json(res, 200, { ok: true });
    }

    if (action === 'delete') {
      if (userId === who.user.id) return json(res, 400, { error: 'You cannot delete your own account.' });
      if (target.role === 'super_admin') {
        return json(res, 400, { error: 'Change this person to another role before deleting a super admin.' });
      }
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) return json(res, 400, { error: error.message });
      return json(res, 200, { ok: true });
    }

    return json(res, 400, { error: 'Unknown action.' });
  } catch (err) {
    return json(res, 500, { error: err.message || 'Something went wrong.' });
  }
}
