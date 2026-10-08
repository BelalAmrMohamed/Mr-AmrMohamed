// api/track.js
// Public, unauthenticated endpoint hit by every visitor's browser.
// Two jobs, selected by `body.type`:
//   "pageview"  -> inserts a page_views row
//   "heartbeat" -> upserts a visitor_heartbeats row (powers the live count)
// No PII is collected: visitor_id/session_id are random IDs the client
// generates and keeps in localStorage/sessionStorage, not tied to identity.

import { db, isSupabaseConfigured } from './lib/supabase.js';
import { getGeo, parseUserAgent } from './lib/request-meta.js';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function isValidId(id) {
  return typeof id === 'string' && id.length >= 6 && id.length <= 64;
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

  // Analytics is best-effort: if Supabase isn't configured yet, no-op
  // quietly so the site never breaks because of this.
  if (!isSupabaseConfigured()) {
    res.status(200).json({ ok: true, tracked: false });
    return;
  }

  let payload;
  try {
    payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    res.status(400).json({ error: 'Invalid JSON body.' });
    return;
  }

  const { type, visitorId, sessionId, path, referrer, isInstalledPwa } = payload || {};

  if (!isValidId(visitorId) || !isValidId(sessionId) || typeof path !== 'string') {
    res.status(400).json({ error: 'Missing or invalid identifiers.' });
    return;
  }

  const { country, city } = getGeo(req);
  const { deviceType, browser, os } = parseUserAgent(req.headers['user-agent']);
  const language = (req.headers['accept-language'] || '').split(',')[0] || null;

  try {
    if (type === 'heartbeat') {
      await db.upsert(
        'visitor_heartbeats',
        [
          {
            visitor_id: visitorId,
            session_id: sessionId,
            path: path.slice(0, 512),
            country,
            device_type: deviceType,
            last_seen_at: new Date().toISOString(),
          },
        ],
        'visitor_id'
      );
      res.status(200).json({ ok: true });
      return;
    }

    // Default: pageview
    await db.insert('page_views', [
      {
        visitor_id: visitorId,
        session_id: sessionId,
        path: path.slice(0, 512),
        referrer: typeof referrer === 'string' ? referrer.slice(0, 512) : null,
        country,
        city,
        device_type: deviceType,
        browser,
        os,
        language,
        is_installed_pwa: Boolean(isInstalledPwa),
      },
    ]);
    res.status(200).json({ ok: true });
  } catch (err) {
    // Never let analytics failures surface to the visitor.
    console.error('[track] failed', err);
    res.status(200).json({ ok: true, tracked: false });
  }
}
