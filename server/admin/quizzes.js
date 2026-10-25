// api/admin/quizzes.js
// Teacher-only quiz management (requireAdmin on every call).
//   GET            -> list of quizzes with question/attempt counts
//   GET  ?id=      -> one quiz + its questions INCLUDING correct answers (for the editor)
//   POST {quiz, questions} -> create (no quiz.id) or update (quiz.id)
//   DELETE ?id=    -> delete the quiz (cascades to questions, attempts, answers)

import { requireAdmin } from '../_lib/auth.js';
import { db } from '../_lib/supabase.js';
import { isUuid, newId, genCode, setCors } from '../_lib/quiz-util.js';

const REVEAL = ['none', 'score', 'full'];
const IDENTITY = ['google_or_name', 'google_only', 'name_only'];
const TYPES = ['single', 'multi', 'true_false', 'essay'];

const str = (v, max) => String(v ?? '').trim().slice(0, max);

function validateQuiz(raw) {
  const q = raw && typeof raw === 'object' ? raw : {};
  const title = str(q.title, 200);
  if (!title) return { error: 'The quiz needs a title.' };

  let time = null;
  if (q.time_limit_minutes !== null && q.time_limit_minutes !== undefined && q.time_limit_minutes !== '') {
    time = Math.round(Number(q.time_limit_minutes));
    if (!Number.isFinite(time) || time < 1 || time > 600) {
      return { error: 'Time limit must be between 1 and 600 minutes (or empty for no limit).' };
    }
  }
  const reveal = REVEAL.includes(q.reveal) ? q.reveal : 'score';
  const identity_mode = IDENTITY.includes(q.identity_mode) ? q.identity_mode : 'google_or_name';

  return {
    value: {
      title,
      description: str(q.description, 2000) || null,
      is_published: !!q.is_published,
      is_listed: !!q.is_listed,
      auto_grade: q.auto_grade !== false,
      reveal,
      identity_mode,
      time_limit_minutes: time,
    },
  };
}

function validateQuestion(raw, index, autoGrade) {
  const n = index + 1;
  const q = raw && typeof raw === 'object' ? raw : {};
  if (!TYPES.includes(q.type)) return { error: `Question ${n}: unknown type.` };
  const prompt = str(q.prompt, 2000);
  if (!prompt) return { error: `Question ${n}: the question text is empty.` };

  let points = Number(q.points);
  if (!Number.isFinite(points)) points = 1;
  if (points <= 0 || points > 1000) return { error: `Question ${n}: points must be between 0 and 1000.` };

  const row = {
    position: index,
    type: q.type,
    prompt,
    points,
    explanation: str(q.explanation, 2000) || null,
    options: null,
    correct: null,
    partial: false,
  };

  if (q.type === 'single' || q.type === 'multi') {
    const opts = (Array.isArray(q.options) ? q.options : [])
      .map((o) => ({ id: str(o?.id, 40), text: str(o?.text, 500) }))
      .filter((o) => o.text);
    if (opts.length < 2) return { error: `Question ${n}: add at least 2 answer options.` };
    if (opts.length > 10) return { error: `Question ${n}: at most 10 options.` };
    const ids = opts.map((o) => o.id);
    if (ids.some((id) => !id) || new Set(ids).size !== ids.length) {
      return { error: `Question ${n}: options need unique ids.` };
    }
    row.options = opts;
    if (q.type === 'single') {
      if (typeof q.correct !== 'string' || !ids.includes(q.correct)) {
        return { error: `Question ${n}: choose the correct option.` };
      }
      row.correct = q.correct;
    } else {
      const c = Array.isArray(q.correct) ? [...new Set(q.correct)] : [];
      if (!c.length || c.some((id) => !ids.includes(id))) {
        return { error: `Question ${n}: tick at least one correct option.` };
      }
      row.correct = c;
      row.partial = !!q.partial;
    }
  } else if (q.type === 'true_false') {
    if (q.correct !== true && q.correct !== false) {
      return { error: `Question ${n}: choose True or False as the correct answer.` };
    }
    row.correct = q.correct;
  } else {
    const kw = (Array.isArray(q.correct?.keywords) ? q.correct.keywords : [])
      .map((g) => ({
        words: (Array.isArray(g?.words) ? g.words : []).map((w) => str(w, 100)).filter(Boolean).slice(0, 20),
      }))
      .filter((g) => g.words.length)
      .slice(0, 30);
    const minWords = Math.max(0, Math.min(5000, Math.round(Number(q.correct?.min_words) || 0)));
    if (autoGrade && !kw.length) {
      return {
        error: `Question ${n}: an essay needs at least one keyword group while auto-grading is on (or turn auto-grading off and grade it by hand).`,
      };
    }
    row.correct = { keywords: kw, min_words: minWords };
  }
  return { value: row };
}

async function uniqueCode() {
  for (let i = 0; i < 8; i++) {
    const code = genCode();
    const hit = await db.select('quizzes', `select=id&code=eq.${code}&limit=1`);
    if (!hit?.length) return code;
  }
  throw new Error('Could not generate a unique quiz code.');
}

function countBy(rows, key = 'quiz_id') {
  const m = {};
  for (const r of rows || []) m[r[key]] = (m[r[key]] || 0) + 1;
  return m;
}

async function listQuizzes() {
  const [quizzes, questions, attempts] = await Promise.all([
    db.select('quizzes', 'select=*&order=created_at.desc&limit=500'),
    db.select('quiz_questions', 'select=quiz_id&limit=20000'),
    db.select('quiz_attempts', 'select=quiz_id,status&limit=50000'),
  ]);
  const qc = countBy(questions);
  const ac = countBy(attempts);
  const pc = countBy((attempts || []).filter((a) => a.status === 'pending'));
  return (quizzes || []).map((q) => ({
    ...q,
    question_count: qc[q.id] || 0,
    attempt_count: ac[q.id] || 0,
    pending_count: pc[q.id] || 0,
  }));
}

async function getQuiz(id) {
  const quizzes = await db.select('quizzes', `select=*&id=eq.${id}&limit=1`);
  if (!quizzes?.[0]) return null;
  const questions = await db.select('quiz_questions', `select=*&quiz_id=eq.${id}&order=position.asc`);
  return { quiz: quizzes[0], questions: questions || [] };
}

async function saveQuiz(body, admin) {
  const qv = validateQuiz(body?.quiz);
  if (qv.error) return { status: 400, error: qv.error };
  const rawQuestions = Array.isArray(body?.questions) ? body.questions : [];
  if (!rawQuestions.length) return { status: 400, error: 'Add at least one question.' };
  if (rawQuestions.length > 200) return { status: 400, error: 'At most 200 questions per quiz.' };

  const rows = [];
  for (let i = 0; i < rawQuestions.length; i++) {
    const v = validateQuestion(rawQuestions[i], i, qv.value.auto_grade);
    if (v.error) return { status: 400, error: v.error };
    rows.push({ ...v.value, _clientId: rawQuestions[i]?.id });
  }

  const editingId = body?.quiz?.id;
  let quizId;
  if (editingId) {
    if (!isUuid(editingId)) return { status: 400, error: 'Bad quiz id.' };
    const existing = await db.select('quizzes', `select=id&id=eq.${editingId}&limit=1`);
    if (!existing?.[0]) return { status: 404, error: 'Quiz not found.' };
    quizId = editingId;
    await db.update('quizzes', `id=eq.${quizId}`, { ...qv.value, updated_at: new Date().toISOString() });
  } else {
    const code = await uniqueCode();
    const created = await db.insert('quizzes', [{ ...qv.value, code, created_by: admin.email }]);
    quizId = created[0].id;
  }

  // Keep existing question ids (so students' stored answers stay attached);
  // an id that doesn't belong to this quiz is treated as a brand-new question.
  const existingQ = editingId
    ? await db.select('quiz_questions', `select=id&quiz_id=eq.${quizId}&limit=1000`)
    : [];
  const existingIds = new Set((existingQ || []).map((r) => r.id));
  const keep = new Set();
  const toWrite = rows.map(({ _clientId, ...r }) => {
    const id = isUuid(_clientId) && existingIds.has(_clientId) && !keep.has(_clientId) ? _clientId : newId();
    keep.add(id);
    return { ...r, id, quiz_id: quizId };
  });

  // Delete questions the teacher removed (their answers go with them).
  for (const id of existingIds) {
    if (!keep.has(id)) await db.delete('quiz_questions', `id=eq.${id}`);
  }
  await db.upsert('quiz_questions', toWrite, 'id');

  return { status: 200, data: await getQuiz(quizId) };
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  try {
    if (req.method === 'GET') {
      const id = req.query?.id;
      if (!id) {
        res.status(200).json({ quizzes: await listQuizzes() });
        return;
      }
      if (!isUuid(id)) return res.status(400).json({ error: 'Bad quiz id.' });
      const data = await getQuiz(id);
      if (!data) return res.status(404).json({ error: 'Quiz not found.' });
      res.status(200).json(data);
      return;
    }

    if (req.method === 'POST') {
      const out = await saveQuiz(req.body, admin);
      if (out.error) return res.status(out.status).json({ error: out.error });
      res.status(200).json(out.data);
      return;
    }

    if (req.method === 'DELETE') {
      const id = req.query?.id;
      if (!isUuid(id)) return res.status(400).json({ error: 'Bad quiz id.' });
      await db.delete('quizzes', `id=eq.${id}`);
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[admin/quizzes]', err);
    res.status(500).json({ error: 'Something went wrong while saving. Please try again.' });
  }
}
