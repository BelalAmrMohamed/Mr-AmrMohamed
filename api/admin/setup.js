// api/admin/setup.js
// One-time (idempotent) bootstrap for the teacher's admin account.
// Protected by ADMIN_SETUP_SECRET — a random value only you set in Vercel
// env vars and share with nobody. Call this once (e.g. with curl or
// Postman) to create or update the admin login, then you never need it
// again. If an admin_users row already exists for the email, this updates
// its password instead of creating a duplicate — so it's safe to re-run
// if the teacher wants to change his password later.

import { db, isSupabaseConfigured } from '../lib/supabase.js';
import { hashPassword } from '../lib/auth.js';

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
    res.status(500).json({ error: 'Supabase is not configured yet.' });
    return;
  }

  const secret = process.env.ADMIN_SETUP_SECRET;
  if (!secret) {
    res.status(500).json({ error: 'ADMIN_SETUP_SECRET is not set on the server.' });
    return;
  }

  let payload;
  try {
    payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    res.status(400).json({ error: 'Invalid JSON body.' });
    return;
  }

  if (payload?.secret !== secret) {
    res.status(401).json({ error: 'Invalid setup secret.' });
    return;
  }

  const email = typeof payload?.email === 'string' ? payload.email.trim().toLowerCase() : '';
  const password = typeof payload?.password === 'string' ? payload.password : '';
  const displayName =
    typeof payload?.displayName === 'string' && payload.displayName.trim()
      ? payload.displayName.trim()
      : 'Mr. Amr';

  if (!email || password.length < 8) {
    res.status(400).json({ error: 'Email and a password of at least 8 characters are required.' });
    return;
  }

  try {
    const passwordHash = await hashPassword(password);
    const existing = await db.select(
      'admin_users',
      `select=id&email=eq.${encodeURIComponent(email)}&limit=1`
    );

    if (existing?.[0]) {
      await db.update('admin_users', `id=eq.${existing[0].id}`, {
        password_hash: passwordHash,
        display_name: displayName,
      });
      res.status(200).json({ ok: true, action: 'updated' });
      return;
    }

    await db.insert('admin_users', [
      { email, password_hash: passwordHash, display_name: displayName },
    ]);
    res.status(200).json({ ok: true, action: 'created' });
  } catch (err) {
    console.error('[admin/setup] failed', err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
}
