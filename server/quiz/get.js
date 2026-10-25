// api/quiz/get.js
// Public: one published quiz by share code, for a student to take.
// Correct answers, explanations and essay keywords are NEVER included here.

import { db } from '../_lib/supabase.js';
import { isCode, publicQuestion, setCors } from '../_lib/quiz-util.js';

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

  const code = String(req.query?.c || '').toLowerCase();
  if (!isCode(code)) {
    res.status(400).json({ error: 'That quiz link is not valid.' });
    return;
  }

  try {
    const rows = await db.select(
      'quizzes',
      `select=id,code,title,description,reveal,identity_mode,time_limit_minutes&code=eq.${code}&is_published=eq.true&limit=1`
    );
    const quiz = rows?.[0];
    if (!quiz) {
      res.status(404).json({ error: 'This quiz does not exist or is not open right now.' });
      return;
    }
    const questions = await db.select('quiz_questions', `select=*&quiz_id=eq.${quiz.id}&order=position.asc`);

    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({
      quiz: {
        code: quiz.code,
        title: quiz.title,
        description: quiz.description,
        reveal: quiz.reveal,
        identity_mode: quiz.identity_mode,
        time_limit_minutes: quiz.time_limit_minutes,
      },
      questions: (questions || []).map(publicQuestion),
    });
  } catch (err) {
    console.error('[quiz/get]', err);
    res.status(500).json({ error: 'Could not load this quiz.' });
  }
}
