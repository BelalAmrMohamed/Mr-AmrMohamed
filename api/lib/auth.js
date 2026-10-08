// api/lib/auth.js
// Password hashing (scrypt, Node built-in, no deps) + cookie session helpers
// for the admin/teacher dashboard. Deliberately simple: one admin account
// (the teacher), long-lived but revocable sessions stored in Postgres.

import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { db } from './supabase.js';

const scrypt = promisify(scryptCb);

const SESSION_COOKIE = 'mramr_admin_session';
const SESSION_TTL_DAYS = 30;

// ---------------------------------------------------------------------------
// Password hashing: scrypt with a random salt, stored as "salt:hash" hex.
// ---------------------------------------------------------------------------
export async function hashPassword(password) {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, 64);
  return `${salt.toString('hex')}:${derived.toString('hex')}`;
}

export async function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [saltHex, hashHex] = stored.split(':');
  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(hashHex, 'hex');
  const derived = await scrypt(password, salt, 64);
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------
export function generateSessionToken() {
  return randomBytes32Hex();
}

function randomBytes32Hex() {
  return randomBytes(32).toString('hex');
}

export async function createSession(adminId, { userAgent, ip } = {}) {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  await db.insert('admin_sessions', [
    {
      token,
      admin_id: adminId,
      expires_at: expiresAt.toISOString(),
      user_agent: userAgent || null,
      ip: ip || null,
    },
  ]);
  return { token, expiresAt };
}

export async function destroySession(token) {
  if (!token) return;
  await db.delete('admin_sessions', `token=eq.${encodeURIComponent(token)}`);
}

export async function getSessionAdmin(token) {
  if (!token) return null;
  const rows = await db.select(
    'admin_sessions',
    `select=token,expires_at,admin_users(id,email,display_name)&token=eq.${encodeURIComponent(token)}&limit=1`
  );
  const session = rows?.[0];
  if (!session) return null;
  if (new Date(session.expires_at).getTime() < Date.now()) {
    // Expired — clean it up lazily.
    await destroySession(token);
    return null;
  }
  return session.admin_users || null;
}

// ---------------------------------------------------------------------------
// Cookie helpers (no framework — raw Vercel Node req/res)
// ---------------------------------------------------------------------------
export function parseCookies(req) {
  const header = req.headers?.cookie;
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(val);
  }
  return out;
}

export function setSessionCookie(res, token, expiresAt) {
  const maxAge = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
  const cookie = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Secure',
    `Max-Age=${maxAge}`,
  ].join('; ');
  appendHeader(res, 'Set-Cookie', cookie);
}

export function clearSessionCookie(res) {
  const cookie = [
    `${SESSION_COOKIE}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Secure',
    'Max-Age=0',
  ].join('; ');
  appendHeader(res, 'Set-Cookie', cookie);
}

function appendHeader(res, name, value) {
  const existing = res.getHeader(name);
  if (!existing) {
    res.setHeader(name, value);
  } else if (Array.isArray(existing)) {
    res.setHeader(name, [...existing, value]);
  } else {
    res.setHeader(name, [existing, value]);
  }
}

export function getSessionTokenFromRequest(req) {
  return parseCookies(req)[SESSION_COOKIE] || null;
}

/**
 * Require a valid admin session. Returns the admin object, or writes a 401
 * response and returns null (caller should `if (!admin) return;`).
 */
export async function requireAdmin(req, res) {
  const token = getSessionTokenFromRequest(req);
  const admin = await getSessionAdmin(token);
  if (!admin) {
    res.status(401).json({ error: 'Not signed in.' });
    return null;
  }
  return admin;
}

export { SESSION_COOKIE };
