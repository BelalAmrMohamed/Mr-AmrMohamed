// api/admin/me.js
// Returns the signed-in admin (verified via Supabase Auth + the
// admin_emails allowlist), or 401/403. The dashboard calls this on load
// to decide whether to show the dashboard or bounce to sign-in.

import { requireAdmin } from '../_lib/auth.js';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  res.status(200).json({ admin });
}
