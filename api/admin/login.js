// api/admin/login.js
// Signs the teacher in: checks email+password against admin_users, creates
// a session row, and sets an HttpOnly cookie. One attempt per request;
// basic rate limiting is left to Vercel/Supabase — this is a single-user
// admin panel, not a public auth system.

import { db, isSupabaseConfigured } from '../lib/supabase.js';
import { verifyPassword, createSession, setSessionCookie } from '../lib/auth.js';
import { getClientIp } from '../lib/request-meta.js';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!isSupabaseConfigured()) {
    res.status(500).json({ error: 'The admin panel is not configured yet.' });
    return;
  }

  let payload;
  try {
    payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    res.status(400).json({ error: 'Invalid JSON body.' });
    return;
  }

  const email = typeof payload?.email === 'string' ? payload.email.trim().toLowerCase() : '';
  const password = typeof payload?.password === 'string' ? payload.password : '';

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  try {
    const rows = await db.select(
      'admin_users',
      `select=id,email,password_hash,display_name&email=eq.${encodeURIComponent(email)}&limit=1`
    );
    const admin = rows?.[0];

    // Always run verifyPassword even on a missing user, against a dummy
    // hash, so the response time doesn't leak whether the email exists.
    const DUMMY_HASH =
      '0000000000000000000000000000000000000000000000000000000000000000:0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';
    const ok = await verifyPassword(password, admin?.password_hash || DUMMY_HASH);

    if (!admin || !ok) {
      res.status(401).json({ error: 'Incorrect email or password.' });
      return;
    }

    const { token, expiresAt } = await createSession(admin.id, {
      userAgent: req.headers['user-agent'],
      ip: getClientIp(req),
    });
    setSessionCookie(res, token, expiresAt);

    await db.update('admin_users', `id=eq.${admin.id}`, {
      last_login_at: new Date().toISOString(),
    });

    res.status(200).json({
      ok: true,
      admin: { email: admin.email, displayName: admin.display_name },
    });
  } catch (err) {
    console.error('[admin/login] failed', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
