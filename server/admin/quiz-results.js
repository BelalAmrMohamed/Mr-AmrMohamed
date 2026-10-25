// api/admin/quiz-results.js
// Teacher-only: see every student's attempt, grade, export.
//   GET  ?id=<quizId>               -> { quiz, questions (with answers), attempts:[{..., answers:[...]}] }
//   GET  ?id=<quizId>&format=csv    -> CSV download (one row per attempt)
//   POST { action:'autograde', quizId }                      -> grade every pending attempt
//   POST { action:'override', answerId, points, feedback }   -> set one answer's score by hand
//   POST { action:'delete_attempt', attemptId }              -> remove one attempt

import { requireAdmin } from '../_lib/auth.js';
import { db } from '../_lib/supabase.js';
import { gradeAnswer } from '../_lib/quiz-grade.js';
import { isUuid, setCors } from '../_lib/quiz-util.js';

const round2 = (n) => Math.round(n * 100) / 100;

async function loadQuiz(id) {
  const quizzes = await db.select('quizzes', `select=*&id=eq.${id}&limit=1`);
  if (!quizzes?.[0]) return null;
  const questions = (await db.select('quiz_questions', `select=*&quiz_id=eq.${id}&order=position.asc`)) || [];
  return { quiz: quizzes[0], questions };
}

async function loadAttempts(quizId) {
  const attempts =
    (await db.select('quiz_attempts', `select=*&quiz_id=eq.${quizId}&order=submitted_at.desc&limit=5000`)) || [];
  if (!attempts.length) return [];
  const answers = (await db.select('quiz_answers', `select=*&attempt_id=in.(${attempts.map((a) => a.id).join(',')})&limit=100000`)) || [];
  const by = {};
  for (const a of answers) (by[a.attempt_id] ||= []).push(a);
  return attempts.map((a) => ({ ...a, answers: by[a.id] || [] }));
}

/** Recompute an attempt's total + status from its stored answers. */
async function recomputeAttempt(attemptId) {
  const answers = (await db.select('quiz_answers', `select=points_awarded&attempt_id=eq.${attemptId}`)) || [];
  const ungraded = answers.some((a) => a.points_awarded === null);
  const score = round2(answers.reduce((s, a) => s + (Number(a.points_awarded) || 0), 0));
  await db.update('quiz_attempts', `id=eq.${attemptId}`, { score, status: ungraded ? 'pending' : 'graded' });
  return { score, status: ungraded ? 'pending' : 'graded' };
}

function csvCell(v) {
  let s = v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
  // Neutralise spreadsheet formula injection from student-typed text.
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function answerText(q, a) {
  if (!a || a.answer === null || a.answer === undefined) return '';
  if (q.type === 'single') return q.options?.find((o) => o.id === a.answer)?.text ?? a.answer;
  if (q.type === 'multi') {
    return (Array.isArray(a.answer) ? a.answer : [])
      .map((id) => q.options?.find((o) => o.id === id)?.text ?? id)
      .join(' | ');
  }
  if (q.type === 'true_false') return a.answer ? 'True' : 'False';
  return String(a.answer);
}

function buildCsv(quiz, questions, attempts) {
  const head = [
    'Name', 'Email', 'Submitted at', 'Status', 'Score', 'Max score', 'Percent',
    ...questions.map((q, i) => `Q${i + 1}: ${q.prompt.slice(0, 80)}`),
    ...questions.map((_, i) => `Q${i + 1} points`),
  ];
  const lines = [head.map(csvCell).join(',')];
  for (const at of attempts) {
    const byQ = new Map(at.answers.map((a) => [a.question_id, a]));
    const pct = at.status === 'graded' && Number(at.max_score) > 0 ? round2((Number(at.score) / Number(at.max_score)) * 100) : '';
    lines.push(
      [
        at.student_name, at.student_email, at.submitted_at, at.status, at.score, at.max_score, pct,
        ...questions.map((q) => answerText(q, byQ.get(q.id))),
        ...questions.map((q) => byQ.get(q.id)?.points_awarded ?? ''),
      ].map(csvCell).join(',')
    );
  }
  return '﻿' + lines.join('\r\n') + '\r\n';
}

async function autograde(quizId) {
  const data = await loadQuiz(quizId);
  if (!data) return { status: 404, error: 'Quiz not found.' };
  const byQ = new Map(data.questions.map((q) => [q.id, q]));
  const pending = (await loadAttempts(quizId)).filter((a) => a.status === 'pending');
  let graded = 0;
  for (const at of pending) {
    for (const a of at.answers) {
      if (a.teacher_override) continue;
      const q = byQ.get(a.question_id);
      if (!q) continue;
      const g = gradeAnswer(q, a.answer);
      await db.update('quiz_answers', `id=eq.${a.id}`, {
        is_correct: g.is_correct,
        points_awarded: g.points_awarded,
        feedback: g.feedback,
      });
    }
    await recomputeAttempt(at.id);
    graded++;
  }
  return { status: 200, data: { ok: true, attempts_processed: graded } };
}

async function override(body) {
  if (!isUuid(body.answerId)) return { status: 400, error: 'Bad answer id.' };
  const points = Number(body.points);
  if (!Number.isFinite(points) || points < 0) return { status: 400, error: 'Points must be 0 or more.' };

  const rows = await db.select('quiz_answers', `select=id,attempt_id,question_id&id=eq.${body.answerId}&limit=1`);
  const ans = rows?.[0];
  if (!ans) return { status: 404, error: 'Answer not found.' };
  const qs = await db.select('quiz_questions', `select=points&id=eq.${ans.question_id}&limit=1`);
  const max = Number(qs?.[0]?.points) || 0;
  if (points > max) return { status: 400, error: `This question is worth at most ${max} points.` };

  await db.update('quiz_answers', `id=eq.${ans.id}`, {
    points_awarded: round2(points),
    is_correct: points >= max ? true : points <= 0 ? false : null,
    feedback: String(body.feedback ?? '').trim().slice(0, 1000) || null,
    teacher_override: true,
  });
  return { status: 200, data: { ok: true, ...(await recomputeAttempt(ans.attempt_id)) } };
}

export default async function handler(req, res) {
  setCors(res, 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  try {
    if (req.method === 'GET') {
      const id = req.query?.id;
      if (!isUuid(id)) return res.status(400).json({ error: 'Bad quiz id.' });
      const data = await loadQuiz(id);
      if (!data) return res.status(404).json({ error: 'Quiz not found.' });
      const attempts = await loadAttempts(id);

      if (req.query?.format === 'csv') {
        const fileName = data.quiz.title.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').slice(0, 60) || 'quiz';
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}-results.csv"`);
        res.status(200).send(buildCsv(data.quiz, data.questions, attempts));
        return;
      }
      res.status(200).json({ ...data, attempts });
      return;
    }

    if (req.method === 'POST') {
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      let out;
      if (body.action === 'autograde') {
        out = isUuid(body.quizId) ? await autograde(body.quizId) : { status: 400, error: 'Bad quiz id.' };
      } else if (body.action === 'override') {
        out = await override(body);
      } else if (body.action === 'delete_attempt') {
        if (!isUuid(body.attemptId)) out = { status: 400, error: 'Bad attempt id.' };
        else {
          await db.delete('quiz_attempts', `id=eq.${body.attemptId}`);
          out = { status: 200, data: { ok: true } };
        }
      } else {
        out = { status: 400, error: 'Unknown action.' };
      }
      if (out.error) return res.status(out.status).json({ error: out.error });
      res.status(200).json(out.data);
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[admin/quiz-results]', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
