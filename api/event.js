// api/event.js
// Public endpoint for lightweight, privacy-safe event tracking:
//  - AI assistant usage (chat started / tool used / quiz completed)
//  - Contact-method clicks (whatsapp/email/telegram/linkedin)
// No message content is ever sent or stored here — only counters/metadata.

import { db, isSupabaseConfigured } from './_lib/supabase.js';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

const AI_EVENT_TYPES = new Set(['chat_started', 'message_sent', 'tool_used', 'quiz_completed']);
const CONTACT_METHODS = new Set(['whatsapp', 'email', 'telegram', 'linkedin']);

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

  const { kind, visitorId } = payload || {};
  if (!isValidId(visitorId)) {
    res.status(400).json({ error: 'Missing or invalid visitorId.' });
    return;
  }

  try {
    if (kind === 'ai') {
      const { eventType, toolName, quizScore, quizTotal } = payload;
      if (!AI_EVENT_TYPES.has(eventType)) {
        res.status(400).json({ error: 'Invalid eventType.' });
        return;
      }
      await db.insert('ai_chat_events', [
        {
          visitor_id: visitorId,
          event_type: eventType,
          tool_name: typeof toolName === 'string' ? toolName.slice(0, 64) : null,
          quiz_score: typeof quizScore === 'number' ? quizScore : null,
          quiz_total: typeof quizTotal === 'number' ? quizTotal : null,
        },
      ]);
      res.status(200).json({ ok: true });
      return;
    }

    if (kind === 'contact') {
      const { method, source } = payload;
      if (!CONTACT_METHODS.has(method)) {
        res.status(400).json({ error: 'Invalid method.' });
        return;
      }
      await db.insert('contact_clicks', [
        {
          visitor_id: visitorId,
          method,
          source: source === 'ai_assistant' ? 'ai_assistant' : 'site',
        },
      ]);
      res.status(200).json({ ok: true });
      return;
    }

    res.status(400).json({ error: 'Invalid kind.' });
  } catch (err) {
    console.error('[event] failed', err);
    res.status(200).json({ ok: true, tracked: false });
  }
}
