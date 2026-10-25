// server/_lib/quiz-util.js
// Small shared helpers for the quiz handlers (no I/O).

import { randomBytes, randomUUID } from 'node:crypto';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v) => typeof v === 'string' && UUID_RE.test(v);
export const newId = () => randomUUID();

/** 6-char lowercase base-36 share code, e.g. "k3x9qa". */
export function genCode() {
  const bytes = randomBytes(6);
  let out = '';
  for (const b of bytes) out += (b % 36).toString(36);
  return out;
}

export const isCode = (v) => typeof v === 'string' && /^[a-z0-9]{4,12}$/.test(v);

export function setCors(res, methods = 'GET, POST, DELETE, OPTIONS') {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

/** Removes everything a student must not see before submitting. */
export function publicQuestion(q) {
  const out = {
    id: q.id,
    position: q.position,
    type: q.type,
    prompt: q.prompt,
    points: q.points,
    options: q.options || null,
  };
  if (q.type === 'multi') out.partial = !!q.partial;
  if (q.type === 'essay') out.min_words = Number(q.correct?.min_words) || 0;
  return out;
}
