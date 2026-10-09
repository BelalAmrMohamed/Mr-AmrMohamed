// api/lib/env.js
// Reliable environment variable access for the serverless functions.
//
// On Vercel (production/preview) variables arrive via process.env as usual.
// Locally, `vercel dev` does NOT always expose `.env.local` to the function
// runtime (it prefers the project's *Development* variables pulled from
// Vercel, and may hand functions an empty set). So when a variable is absent
// from process.env we fall back to reading `.env.local` / `.env` ourselves.
//
// Values are resolved lazily (at request time, never at import time) so a
// missing variable can't be frozen in as `undefined` when a module loads.
// This never runs on Vercel deployments: there VERCEL_ENV is set and the
// files aren't present anyway.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

let fileVars = null;

function parseEnvFile(text) {
  const out = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).replace(/^export\s+/, '').trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    } else {
      val = val.replace(/\s+#.*$/, ''); // strip trailing inline comment
    }
    if (key) out[key] = val;
  }
  return out;
}

function loadFileVars() {
  if (fileVars) return fileVars;
  fileVars = {};

  const here = path.dirname(fileURLToPath(import.meta.url));
  const roots = [...new Set([process.cwd(), path.resolve(here, '..', '..')])];

  // Later files win over earlier ones within a root: .env < .env.local
  for (const root of roots) {
    for (const name of ['.env', '.env.local']) {
      try {
        const text = fs.readFileSync(path.join(root, name), 'utf8');
        Object.assign(fileVars, parseEnvFile(text));
      } catch {
        /* file not present -- fine */
      }
    }
  }
  return fileVars;
}

/** Returns the variable's value, or undefined if it isn't set anywhere. */
export function getEnv(name) {
  const fromProcess = process.env[name];
  if (fromProcess !== undefined && fromProcess !== '') return fromProcess;
  if (process.env.VERCEL_ENV === 'production' || process.env.VERCEL_ENV === 'preview') {
    return undefined; // never read files on real deployments
  }
  const fromFile = loadFileVars()[name];
  return fromFile === '' ? undefined : fromFile;
}
