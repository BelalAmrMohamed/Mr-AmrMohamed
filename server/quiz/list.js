// api/quiz/list.js
// Public: quizzes that are published AND marked "listed" (shown on /quiz).
// Quizzes that are only published are reachable by their link but never listed here.

import { db } from '../_lib/supabase.js';
import { setCors } from '../_lib/quiz-util.js';

export default async function handler(req, res) {
  setCors(res, 'GET, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const quizzes = await db.select(
      'quizzes',
      'select=id,code,title,description,time_limit_minutes&is_published=eq.true&is_listed=eq.true&order=created_at.desc&limit=100'
    );
    const list = quizzes || [];
    let counts = {};
    if (list.length) {
      const ids = list.map((q) => q.id).join(',');
      const qs = await db.select('quiz_questions', `select=quiz_id&quiz_id=in.(${ids})&limit=20000`);
      for (const r of qs || []) counts[r.quiz_id] = (counts[r.quiz_id] || 0) + 1;
    }
    res.setHeader('Cache-Control', 'public, max-age=30');
    res.status(200).json({
      quizzes: list.map((q) => ({
        code: q.code,
        title: q.title,
        description: q.description,
        time_limit_minutes: q.time_limit_minutes,
        question_count: counts[q.id] || 0,
      })),
    });
  } catch (err) {
    console.error('[quiz/list]', err);
    res.status(500).json({ error: 'Could not load quizzes.' });
  }
}
