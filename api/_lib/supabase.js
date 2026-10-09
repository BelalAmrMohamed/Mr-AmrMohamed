// api/lib/supabase.js
// Minimal Supabase REST (PostgREST) client using only `fetch` — no SDK
// dependency needed. Always uses the service role key, server-side only.
// NEVER import this file from anything that ships to the browser.

import { getEnv } from './env.js';

// Resolved lazily (per call) so env loading can never be frozen as undefined.
const getUrl = () => getEnv('NEXT_PUBLIC_SUPABASE_URL');
const getServiceKey = () => getEnv('SUPABASE_SERVICE_ROLE_KEY');

function assertConfigured() {
  if (!getUrl() || !getServiceKey()) {
    throw new Error(
      'Supabase is not configured (missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY).'
    );
  }
}

/**
 * Low-level PostgREST request helper.
 * @param {string} table
 * @param {object} opts
 */
async function restRequest(table, { method = 'GET', query = '', body, headers = {} } = {}) {
  assertConfigured();
  const SERVICE_KEY = getServiceKey();
  const url = `${getUrl()}/rest/v1/${table}${query ? `?${query}` : ''}`;
  const resp = await fetch(url, {
    method,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: method === 'POST' ? 'return=representation' : 'return=representation',
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`Supabase ${method} ${table} failed: ${resp.status} ${text}`);
  }
  if (resp.status === 204) return null;
  const text = await resp.text();
  return text ? JSON.parse(text) : null;
}

export const db = {
  /** SELECT with PostgREST query string, e.g. "select=*&order=created_at.desc&limit=50" */
  select(table, query = 'select=*') {
    return restRequest(table, { method: 'GET', query });
  },
  insert(table, rows) {
    return restRequest(table, { method: 'POST', body: rows });
  },
  /** UPSERT using Prefer: resolution=merge-duplicates (requires a unique/PK conflict target) */
  upsert(table, rows, onConflict) {
    return restRequest(table, {
      method: 'POST',
      body: rows,
      query: onConflict ? `on_conflict=${onConflict}` : '',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    });
  },
  update(table, query, patch) {
    return restRequest(table, { method: 'PATCH', query, body: patch });
  },
  delete(table, query) {
    return restRequest(table, { method: 'DELETE', query });
  },
  /** Call a Postgres function exposed via RPC (POST /rest/v1/rpc/<fn>) */
  rpc(fn, args = {}) {
    return restRequest(`rpc/${fn}`, { method: 'POST', body: args });
  },
};

export function isSupabaseConfigured() {
  return Boolean(getUrl() && getServiceKey());
}
