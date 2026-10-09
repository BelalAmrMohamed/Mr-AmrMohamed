// api/admin/cleanup.js
// Housekeeping: deletes stale "live visitor" heartbeats so the table stays
// small. Safe to call repeatedly. Wired to a Vercel Cron Job (vercel.json
// "crons") hitting this with the CRON_SECRET header; also callable by a
// signed-in admin. (Session expiry is handled entirely by Supabase Auth now
// — there's no session table of our own left to clean up.)

import { db, isSupabaseConfigured } from '../lib/supabase.js';
import { requireAdmin } from '../lib/auth.js';
import { getEnv } from '../lib/env.js';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  // Vercel Cron Jobs call with GET; the dashboard (if it ever triggers this
  // manually) uses POST. Both are accepted — auth is what actually gates it.
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!isSupabaseConfigured()) {
    res.status(500).json({ error: 'Not configured.' });
    return;
  }

  const cronSecret = getEnv('CRON_SECRET');
  const authHeader = req.headers.authorization || '';
  const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!isCron) {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
  }

  try {
    const staleHeartbeat = new Date(Date.now() - 5 * 60 * 1000).toISOString(); // 5 min
    await db.delete('visitor_heartbeats', `last_seen_at=lt.${staleHeartbeat}`);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[admin/cleanup] failed', err);
    res.status(500).json({ error: 'Cleanup failed.' });
  }
}
