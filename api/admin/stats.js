// api/admin/stats.js
// The one endpoint the dashboard polls. Returns everything it needs in a
// single round trip: live visitor count, totals, a 30-day daily series,
// breakdowns (pages/referrers/countries/devices/browsers), the recent
// visitor feed, AI assistant usage, and contact-click counts.
//
// Requires an admin session (cookie). All queries use the service role key
// via the db helper, so RLS on the underlying tables doesn't need public
// policies at all.

import { db, isSupabaseConfigured } from '../lib/supabase.js';
import { requireAdmin } from '../lib/auth.js';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function countBy(rows, key) {
  const counts = new Map();
  for (const row of rows) {
    const val = row[key] || 'Unknown';
    counts.set(val, (counts.get(val) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

function buildDailySeries(rows, days) {
  const byDay = new Map();
  for (const row of rows) {
    const day = row.created_at.slice(0, 10); // YYYY-MM-DD
    const entry = byDay.get(day) || { views: 0, visitors: new Set() };
    entry.views += 1;
    entry.visitors.add(row.visitor_id);
    byDay.set(day, entry);
  }
  const out = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    const entry = byDay.get(key);
    out.push({
      date: key,
      views: entry ? entry.views : 0,
      visitors: entry ? entry.visitors.size : 0,
    });
  }
  return out;
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
  if (!isSupabaseConfigured()) {
    res.status(500).json({ error: 'The admin panel is not configured yet.' });
    return;
  }

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  try {
    const now = new Date();
    const since30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const liveThreshold = new Date(now.getTime() - 60 * 1000).toISOString(); // "live" = last 60s

    const [
      recent30d,
      liveHeartbeats,
      recentFeed,
      allTimeCountRows,
      aiEvents24h,
      contactClicks30d,
      topAiTools30d,
    ] = await Promise.all([
      db.select(
        'page_views',
        `select=created_at,visitor_id,path,referrer,country,device_type,browser&created_at=gte.${since30d}&order=created_at.desc&limit=5000`
      ),
      db.select(
        'visitor_heartbeats',
        `select=visitor_id,path,country,device_type,last_seen_at&last_seen_at=gte.${liveThreshold}&order=last_seen_at.desc&limit=200`
      ),
      db.select(
        'page_views',
        `select=created_at,path,referrer,country,city,device_type,browser,os&order=created_at.desc&limit=25`
      ),
      db.select('page_views', `select=id&created_at=gte.${since24h}`),
      db.select(
        'ai_chat_events',
        `select=event_type,tool_name,quiz_score,quiz_total&created_at=gte.${since24h}`
      ),
      db.select('contact_clicks', `select=method,source&created_at=gte.${since30d}`),
      db.select(
        'ai_chat_events',
        `select=tool_name&event_type=eq.tool_used&created_at=gte.${since30d}&tool_name=not.is.null`
      ),
    ]);

    const uniqueVisitors30d = new Set(recent30d.map((r) => r.visitor_id)).size;
    const views24h = allTimeCountRows.length;

    const chatStarted = aiEvents24h.filter((e) => e.event_type === 'chat_started').length;
    const messagesSent = aiEvents24h.filter((e) => e.event_type === 'message_sent').length;
    const quizzes = aiEvents24h.filter((e) => e.event_type === 'quiz_completed');
    const quizAvgScore =
      quizzes.length > 0
        ? quizzes.reduce((sum, q) => sum + (q.quiz_score || 0), 0) / quizzes.length
        : null;

    res.status(200).json({
      live: {
        count: liveHeartbeats.length,
        visitors: liveHeartbeats.map((h) => ({
          path: h.path,
          country: h.country,
          deviceType: h.device_type,
          lastSeenAt: h.last_seen_at,
        })),
      },
      totals: {
        views24h,
        views30d: recent30d.length,
        uniqueVisitors30d,
      },
      dailySeries: buildDailySeries(recent30d, 30),
      breakdown: {
        topPages: countBy(recent30d, 'path').slice(0, 10),
        topReferrers: countBy(
          recent30d.map((r) => ({ referrer: referrerHostname(r.referrer) })),
          'referrer'
        ).slice(0, 10),
        countries: countBy(recent30d, 'country').slice(0, 10),
        devices: countBy(recent30d, 'device_type'),
        browsers: countBy(recent30d, 'browser').slice(0, 8),
      },
      recentFeed: recentFeed.map((r) => ({
        time: r.created_at,
        path: r.path,
        referrer: r.referrer,
        country: r.country,
        city: r.city,
        deviceType: r.device_type,
        browser: r.browser,
        os: r.os,
      })),
      aiAssistant: {
        chatsStarted24h: chatStarted,
        messagesSent24h: messagesSent,
        quizzesCompleted24h: quizzes.length,
        quizAvgScore,
        topTools30d: countBy(topAiTools30d, 'tool_name').slice(0, 8),
      },
      contactClicks30d: countBy(contactClicks30d, 'method'),
      generatedAt: now.toISOString(),
    });
  } catch (err) {
    console.error('[admin/stats] failed', err);
    res.status(500).json({ error: 'Failed to load stats.' });
  }
}

function referrerHostname(referrer) {
  if (!referrer) return 'Direct';
  try {
    return new URL(referrer).hostname.replace(/^www\./, '');
  } catch {
    return 'Direct';
  }
}
