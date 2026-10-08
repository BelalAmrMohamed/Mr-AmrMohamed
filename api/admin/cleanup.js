// api/admin/cleanup.js
// Housekeeping: deletes expired sessions and stale heartbeats. Safe to call
// repeatedly. Can be wired to a Vercel Cron Job (vercel.json "crons") hitting
// this with the CRON_SECRET header, or triggered manually from the
// dashboard. Requires either a valid admin session OR the cron secret.

import { db, isSupabaseConfigured } from '../lib/supabase.js';
import { requireAdmin } from '../lib/auth.js';

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

  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization || '';
  const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!isCron) {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
  }

  try {
    const now = new Date().toISOString();
    const staleHeartbeat = new Date(Date.now() - 5 * 60 * 1000).toISOString(); // 5 min

    await Promise.all([
      db.delete('admin_sessions', `expires_at=lt.${now}`),
      db.delete('visitor_heartbeats', `last_seen_at=lt.${staleHeartbeat}`),
    ]);

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[admin/cleanup] failed', err);
    res.status(500).json({ error: 'Cleanup failed.' });
  }
}
