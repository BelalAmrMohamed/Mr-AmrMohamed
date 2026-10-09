// api/lib/auth.js
// Admin auth, fully delegated to Supabase Auth -- either Google Sign-In or
// Supabase's own built-in email/password. There is no password of ours
// anywhere: Supabase issues a JWT on sign-in (via either method), the
// browser sends it on every /api/admin/* request, and we verify it here by
// asking Supabase who it belongs to, then checking that email against the
// admin_emails allowlist table. This file doesn't care which method was
// used to sign in -- a valid Supabase session is a valid Supabase session.

import { db } from './supabase.js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Verifies a Supabase access token (JWT) by asking Supabase Auth who it
 * belongs to. This is a live API call rather than local JWT verification --
 * simpler, no JWT-library dependency, and it also catches revoked/expired
 * tokens immediately.
 */
async function getSupabaseUser(accessToken) {
  if (!accessToken || !URL || !SERVICE_KEY) return null;
  const resp = await fetch(`${URL}/auth/v1/user`, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!resp.ok) return null;
  const user = await resp.json().catch(() => null);
  return user?.email ? user : null;
}

async function isAllowedAdminEmail(email) {
  if (!email) return false;
  const rows = await db.select(
    'admin_emails',
    `select=email&email=eq.${encodeURIComponent(email.toLowerCase())}&limit=1`
  );
  return Boolean(rows?.[0]);
}

function getBearerToken(req) {
  const header = req.headers?.authorization || '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match ? match[1] : null;
}

/**
 * Require a signed-in Supabase account (Google OR email/password) whose
 * email is on the admin_emails allowlist. Returns { email, name, avatarUrl }
 * on success, or writes a 401/403 response and returns null (caller should
 * `if (!admin) return;`).
 */
export async function requireAdmin(req, res) {
  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Not signed in.' });
    return null;
  }

  const user = await getSupabaseUser(token);
  if (!user) {
    res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
    return null;
  }

  const allowed = await isAllowedAdminEmail(user.email);
  if (!allowed) {
    res.status(403).json({ error: `${user.email} is not authorized to view this dashboard.` });
    return null;
  }

  const meta = user.user_metadata || {};
  return {
    email: user.email,
    name: meta.full_name || meta.name || user.email.split('@')[0],
    avatarUrl: meta.avatar_url || meta.picture || null,
  };
}
