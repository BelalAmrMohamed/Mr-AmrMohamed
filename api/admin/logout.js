// api/admin/logout.js
import { destroySession, getSessionTokenFromRequest, clearSessionCookie } from '../lib/auth.js';

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

  try {
    const token = getSessionTokenFromRequest(req);
    await destroySession(token);
  } catch (err) {
    console.error('[admin/logout] failed', err);
  }
  clearSessionCookie(res);
  res.status(200).json({ ok: true });
}
