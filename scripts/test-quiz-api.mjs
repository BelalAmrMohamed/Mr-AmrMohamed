// End-to-end smoke test of the quiz API handlers against an in-memory fake of Supabase
// (PostgREST + Auth), so no database or network is needed.  Run: node scripts/test-quiz-api.mjs
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://fake.supabase';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
process.env.VERCEL_ENV = 'production'; // stop env.js from reading real .env files

// ---------- fake Supabase ----------
const T = { admin_emails: [{ email: 'teacher@example.com' }], quizzes: [], quiz_questions: [], quiz_attempts: [], quiz_answers: [] };
const TOKENS = {
  'teacher-token': { id: 'u-t', email: 'teacher@example.com', user_metadata: { full_name: 'Mr Amr' } },
  'student-token': { id: '11111111-1111-4111-8111-111111111111', email: 'sara@gmail.com', user_metadata: { full_name: 'Sara Google' } },
  'rando-token': { id: 'u-r', email: 'rando@example.com', user_metadata: {} },
};
const defaults = {
  quizzes: () => ({ id: randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
  quiz_answers: () => ({ id: randomUUID(), teacher_override: false }),
  quiz_attempts: () => ({ submitted_at: new Date().toISOString() }),
  quiz_questions: () => ({ id: randomUUID() }),
};
const match = (row, filters) =>
  filters.every(([col, expr]) => {
    if (expr.startsWith('eq.')) return String(row[col]) === expr.slice(3);
    if (expr.startsWith('in.(')) return expr.slice(4, -1).split(',').includes(String(row[col]));
    return true;
  });
function cascade(table, ids) {
  if (!ids.length) return;
  if (table === 'quizzes') {
    const qs = T.quiz_questions.filter((r) => ids.includes(r.quiz_id)).map((r) => r.id);
    const as = T.quiz_attempts.filter((r) => ids.includes(r.quiz_id)).map((r) => r.id);
    T.quiz_questions = T.quiz_questions.filter((r) => !ids.includes(r.quiz_id));
    T.quiz_attempts = T.quiz_attempts.filter((r) => !ids.includes(r.quiz_id));
    cascade('quiz_questions_answers', qs);
    cascade('attempts_answers', as);
  } else if (table === 'quiz_questions' || table === 'quiz_questions_answers') {
    T.quiz_answers = T.quiz_answers.filter((r) => !ids.includes(r.question_id));
  } else if (table === 'quiz_attempts' || table === 'attempts_answers') {
    T.quiz_answers = T.quiz_answers.filter((r) => !ids.includes(r.attempt_id));
  }
}
globalThis.fetch = async (url, opts = {}) => {
  const u = new URL(url);
  const json = (status, body) => ({ ok: status < 400, status, text: async () => (body === undefined ? '' : JSON.stringify(body)), json: async () => body });
  if (u.pathname === '/auth/v1/user') {
    const tok = (opts.headers?.Authorization || '').replace('Bearer ', '');
    return TOKENS[tok] ? json(200, TOKENS[tok]) : json(401, { msg: 'bad token' });
  }
  const table = u.pathname.replace('/rest/v1/', '');
  const filters = [...u.searchParams].filter(([k]) => !['select', 'order', 'limit', 'on_conflict'].includes(k));
  const method = opts.method || 'GET';
  const body = opts.body ? JSON.parse(opts.body) : undefined;
  if (!T[table]) return json(404, { message: 'no table ' + table });
  if (method === 'GET') {
    let rows = T[table].filter((r) => match(r, filters));
    const order = u.searchParams.get('order');
    if (order) {
      const [col, dir] = order.split('.');
      rows = [...rows].sort((a, b) => (a[col] > b[col] ? 1 : a[col] < b[col] ? -1 : 0) * (dir === 'desc' ? -1 : 1));
    }
    const lim = Number(u.searchParams.get('limit'));
    return json(200, lim ? rows.slice(0, lim) : rows);
  }
  if (method === 'POST') {
    const out = [];
    const onConflict = u.searchParams.get('on_conflict');
    for (const r of body) {
      const row = { ...(defaults[table]?.() || {}), ...r };
      const existing = onConflict ? T[table].find((x) => x[onConflict] === row[onConflict]) : null;
      if (existing) Object.assign(existing, r), out.push(existing);
      else {
        if (table === 'quiz_attempts' && T[table].some((x) => x.id === row.id)) return json(409, { message: 'duplicate' });
        T[table].push(row);
        out.push(row);
      }
    }
    return json(201, out);
  }
  if (method === 'PATCH') {
    const rows = T[table].filter((r) => match(r, filters));
    rows.forEach((r) => Object.assign(r, body));
    return json(200, rows);
  }
  if (method === 'DELETE') {
    const rows = T[table].filter((r) => match(r, filters));
    T[table] = T[table].filter((r) => !rows.includes(r));
    cascade(table, rows.map((r) => r.id));
    return json(200, rows);
  }
  return json(400, {});
};

// ---------- tiny req/res ----------
async function call(handler, { method = 'GET', query = {}, body, token } = {}) {
  const req = { method, query, body, headers: token ? { authorization: 'Bearer ' + token } : {} };
  return new Promise((resolve) => {
    const r = { status: 200, headers: {}, body: undefined };
    const res = {
      status(c) { r.status = c; return res; },
      setHeader(k, v) { r.headers[k] = v; return res; },
      json(o) { r.body = o; resolve(r); return res; },
      send(d) { r.body = d; resolve(r); return res; },
      end() { resolve(r); return res; },
    };
    Promise.resolve(handler(req, res)).then(() => resolve(r));
  });
}

const t = async (name, fn) => { await fn(); console.log('ok  ', name); };

const { default: adminQuizzes } = await import('../server/admin/quizzes.js');
const { default: adminResults } = await import('../server/admin/quiz-results.js');
const { default: qList } = await import('../server/quiz/list.js');
const { default: qGet } = await import('../server/quiz/get.js');
const { default: qSubmit } = await import('../server/quiz/submit.js');

const draft = (over = {}) => ({
  quiz: { title: 'Unit 1', is_published: true, is_listed: true, auto_grade: true, reveal: 'full', identity_mode: 'google_or_name', ...over },
  questions: [
    { type: 'single', prompt: 'Capital of France?', points: 1, options: [{ id: 'a', text: 'Paris' }, { id: 'b', text: 'Rome' }], correct: 'a', explanation: 'It is Paris.' },
    { type: 'multi', prompt: 'Pick primes', points: 2, options: [{ id: 'a', text: '2' }, { id: 'b', text: '4' }, { id: 'c', text: '5' }], correct: ['a', 'c'] },
    { type: 'true_false', prompt: 'The sky is green', points: 1, correct: false },
    { type: 'essay', prompt: 'Describe the water cycle', points: 4, correct: { keywords: [{ words: ['evaporation', 'evaporate'] }, { words: ['rain', 'precipitation'] }], min_words: 3 } },
  ],
});

let quiz, questions, code;

await t('admin endpoints reject anonymous and non-admin users', async () => {
  assert.equal((await call(adminQuizzes)).status, 401);
  assert.equal((await call(adminQuizzes, { token: 'rando-token' })).status, 403);
  assert.equal((await call(adminResults, { query: { id: randomUUID() } })).status, 401);
});

await t('create validates input', async () => {
  const bad = draft();
  bad.questions[0].correct = 'zzz';
  const r = await call(adminQuizzes, { method: 'POST', token: 'teacher-token', body: bad });
  assert.equal(r.status, 400);
  assert.match(r.body.error, /Question 1/);
  const noTitle = await call(adminQuizzes, { method: 'POST', token: 'teacher-token', body: draft({ title: ' ' }) });
  assert.equal(noTitle.status, 400);
  const noKw = draft();
  noKw.questions[3].correct = { keywords: [] };
  assert.equal((await call(adminQuizzes, { method: 'POST', token: 'teacher-token', body: noKw })).status, 400);
});

await t('create a quiz with all four question types', async () => {
  const r = await call(adminQuizzes, { method: 'POST', token: 'teacher-token', body: draft() });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  quiz = r.body.quiz;
  questions = r.body.questions;
  code = quiz.code;
  assert.match(code, /^[a-z0-9]{6}$/);
  assert.equal(questions.length, 4);
  assert.deepEqual(questions.map((q) => q.position), [0, 1, 2, 3]);
});

await t('public list shows listed quizzes only', async () => {
  const r = await call(qList);
  assert.equal(r.body.quizzes.length, 1);
  assert.equal(r.body.quizzes[0].question_count, 4);
  await call(adminQuizzes, { method: 'POST', token: 'teacher-token', body: { ...draft({ title: 'Hidden', is_listed: false }) } });
  assert.equal((await call(qList)).body.quizzes.length, 1);
});

await t('public get never leaks answers', async () => {
  const r = await call(qGet, { query: { c: code } });
  assert.equal(r.status, 200);
  const text = JSON.stringify(r.body);
  for (const leak of ['correct', 'explanation', 'keywords', 'evaporation']) assert.ok(!text.includes(leak), 'leaked: ' + leak);
  assert.equal(r.body.questions.length, 4);
  assert.equal((await call(qGet, { query: { c: 'nope!!' } })).status, 400);
  assert.equal((await call(qGet, { query: { c: 'zzzzzz' } })).status, 404);
});

const idOf = (type) => questions.find((q) => q.type === type).id;
const perfect = () => ({
  [idOf('single')]: 'a',
  [idOf('multi')]: ['c', 'a'],
  [idOf('true_false')]: false,
  [idOf('essay')]: 'Water goes through evaporation and then rain falls',
});

await t('student submits by typed name: graded, full reveal', async () => {
  const attemptId = randomUUID();
  const r = await call(qSubmit, { method: 'POST', body: { c: code, attemptId, name: '  Omar  ', answers: perfect() } });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.score, 8);
  assert.equal(r.body.max_score, 8);
  assert.equal(r.body.results.length, 4);
  assert.equal(r.body.results.find((x) => x.questionId === idOf('single')).explanation, 'It is Paris.');
  assert.equal(T.quiz_attempts.find((a) => a.id === attemptId).student_name, 'Omar');
  // idempotent
  const again = await call(qSubmit, { method: 'POST', body: { c: code, attemptId, name: 'Omar', answers: {} } });
  assert.equal(again.body.score, 8);
  assert.equal(T.quiz_attempts.length, 1);
});

await t('submit requires a name, or a verified Google session', async () => {
  const r = await call(qSubmit, { method: 'POST', body: { c: code, attemptId: randomUUID(), name: ' ', answers: {} } });
  assert.equal(r.status, 400);
  const g = await call(qSubmit, { method: 'POST', token: 'student-token', body: { c: code, attemptId: randomUUID(), answers: { [idOf('single')]: 'b' } } });
  assert.equal(g.status, 200);
  const row = T.quiz_attempts.find((a) => a.student_email === 'sara@gmail.com');
  assert.equal(row.student_name, 'Sara Google');
  assert.equal(g.body.score, 0 + 0 + 0 + 0);
});

await t('google_only blocks anonymous, name_only ignores tokens', async () => {
  const go = await call(adminQuizzes, { method: 'POST', token: 'teacher-token', body: draft({ title: 'G only', identity_mode: 'google_only' }) });
  const ok = await call(qSubmit, { method: 'POST', body: { c: go.body.quiz.code, attemptId: randomUUID(), name: 'X', answers: {} } });
  assert.equal(ok.status, 401);
  const forged = await call(qSubmit, { method: 'POST', token: 'bogus', body: { c: go.body.quiz.code, attemptId: randomUUID(), name: 'X', answers: {} } });
  assert.equal(forged.status, 401);
  const no = await call(adminQuizzes, { method: 'POST', token: 'teacher-token', body: draft({ title: 'N only', identity_mode: 'name_only' }) });
  const r = await call(qSubmit, { method: 'POST', token: 'student-token', body: { c: no.body.quiz.code, attemptId: randomUUID(), name: 'Typed', answers: {} } });
  assert.equal(r.status, 200);
  assert.equal(T.quiz_attempts.find((a) => a.student_name === 'Typed').student_email, null);
});

await t('unpublished quiz cannot be opened or submitted', async () => {
  const d = await call(adminQuizzes, { method: 'POST', token: 'teacher-token', body: draft({ title: 'Draft', is_published: false }) });
  assert.equal((await call(qGet, { query: { c: d.body.quiz.code } })).status, 404);
  assert.equal((await call(qSubmit, { method: 'POST', body: { c: d.body.quiz.code, attemptId: randomUUID(), name: 'A', answers: {} } })).status, 404);
});

await t('auto_grade off: stored ungraded, nothing revealed, then auto-grade on demand', async () => {
  const m = await call(adminQuizzes, { method: 'POST', token: 'teacher-token', body: draft({ title: 'Manual', auto_grade: false }) });
  const mq = m.body.questions;
  const id = (type) => mq.find((q) => q.type === type).id;
  const attemptId = randomUUID();
  const r = await call(qSubmit, {
    method: 'POST',
    body: { c: m.body.quiz.code, attemptId, name: 'Lina', answers: { [id('single')]: 'a', [id('multi')]: ['a', 'c'], [id('true_false')]: false, [id('essay')]: 'evaporation then precipitation' } },
  });
  assert.deepEqual(r.body, { ok: true, status: 'pending' });
  const at = T.quiz_attempts.find((a) => a.id === attemptId);
  assert.equal(at.score, null);
  assert.ok(T.quiz_answers.filter((a) => a.attempt_id === attemptId).every((a) => a.points_awarded === null));

  const g = await call(adminResults, { method: 'POST', token: 'teacher-token', body: { action: 'autograde', quizId: m.body.quiz.id } });
  assert.equal(g.body.attempts_processed, 1);
  assert.equal(at.status, 'graded');
  assert.equal(at.score, 8);
});

await t('teacher override of an essay score updates the total', async () => {
  const attemptId = randomUUID();
  await call(qSubmit, { method: 'POST', body: { c: code, attemptId, name: 'Hana', answers: { ...perfect(), [idOf('essay')]: 'it will rain a lot here today' } } });
  const at = T.quiz_attempts.find((a) => a.id === attemptId);
  assert.equal(at.score, 6); // essay: 1 of 2 key ideas -> 2 of 4
  const ans = T.quiz_answers.find((a) => a.attempt_id === attemptId && a.question_id === idOf('essay'));
  const tooMuch = await call(adminResults, { method: 'POST', token: 'teacher-token', body: { action: 'override', answerId: ans.id, points: 9 } });
  assert.equal(tooMuch.status, 400);
  const r = await call(adminResults, { method: 'POST', token: 'teacher-token', body: { action: 'override', answerId: ans.id, points: 4, feedback: 'Good enough' } });
  assert.equal(r.body.score, 8);
  assert.equal(ans.teacher_override, true);
});

await t('results + csv', async () => {
  const r = await call(adminResults, { token: 'teacher-token', query: { id: quiz.id } });
  assert.equal(r.status, 200);
  assert.equal(r.body.attempts.length, 3);
  assert.ok(r.body.attempts[0].answers.length > 0);
  const csv = await call(adminResults, { token: 'teacher-token', query: { id: quiz.id, format: 'csv' } });
  assert.equal(csv.status, 200);
  assert.match(csv.headers['Content-Type'], /text\/csv/);
  assert.match(csv.body, /Omar/);
  assert.match(csv.body, /sara@gmail\.com/);
  assert.match(csv.body, /Paris/);
});

await t('csv neutralises formula injection', async () => {
  const attemptId = randomUUID();
  await call(qSubmit, { method: 'POST', body: { c: code, attemptId, name: '=HYPERLINK("x")', answers: {} } });
  const csv = await call(adminResults, { token: 'teacher-token', query: { id: quiz.id, format: 'csv' } });
  assert.ok(csv.body.includes(`"'=HYPERLINK(""x"")"`), csv.body.split('\r\n').find((l) => l.includes('HYPERLINK')));
});

await t('editing keeps existing question ids and answers; removing a question drops its answers', async () => {
  const before = (await call(adminResults, { token: 'teacher-token', query: { id: quiz.id } })).body;
  const edit = {
    quiz: { ...quiz, title: 'Unit 1 (edited)' },
    questions: questions.slice(0, 3).map((q, i) => ({ ...q, prompt: i === 0 ? 'Capital of France??' : q.prompt })),
  };
  const r = await call(adminQuizzes, { method: 'POST', token: 'teacher-token', body: edit });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.quiz.title, 'Unit 1 (edited)');
  assert.deepEqual(r.body.questions.map((q) => q.id), questions.slice(0, 3).map((q) => q.id));
  const after = (await call(adminResults, { token: 'teacher-token', query: { id: quiz.id } })).body;
  assert.equal(after.attempts.length, before.attempts.length);
  assert.ok(after.attempts.every((a) => a.answers.every((x) => x.question_id !== idOf('essay'))));
  assert.ok(after.attempts.some((a) => a.answers.length === 3));
});

await t('deleting a quiz removes questions, attempts, answers', async () => {
  const r = await call(adminQuizzes, { method: 'DELETE', token: 'teacher-token', query: { id: quiz.id } });
  assert.equal(r.status, 200);
  assert.ok(!T.quiz_questions.some((q) => q.quiz_id === quiz.id));
  assert.ok(!T.quiz_attempts.some((a) => a.quiz_id === quiz.id));
  assert.equal((await call(adminQuizzes, { token: 'teacher-token', query: { id: quiz.id } })).status, 404);
});

console.log('\nAll quiz-api tests passed.');
