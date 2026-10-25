// Plain-node tests for the quiz grader. Run: node scripts/test-quiz-grade.mjs
import assert from 'node:assert/strict';
import { gradeAnswer, gradeAttempt, countWords } from '../server/_lib/quiz-grade.js';

const t = (name, fn) => { fn(); console.log('ok  ', name); };

t('single: right / wrong / blank', () => {
  const q = { type: 'single', correct: 'b', points: 2 };
  assert.equal(gradeAnswer(q, 'b').points_awarded, 2);
  assert.equal(gradeAnswer(q, 'a').points_awarded, 0);
  assert.equal(gradeAnswer(q, null).is_correct, false);
});

t('true_false: boolean and string forms', () => {
  const q = { type: 'true_false', correct: true, points: 1 };
  assert.equal(gradeAnswer(q, true).is_correct, true);
  assert.equal(gradeAnswer(q, 'true').is_correct, true);
  assert.equal(gradeAnswer(q, false).is_correct, false);
  assert.equal(gradeAnswer(q, null).is_correct, false);
  assert.equal(gradeAnswer({ ...q, correct: false }, false).is_correct, true);
});

t('multi: all-or-nothing', () => {
  const q = { type: 'multi', correct: ['a', 'c'], points: 2, partial: false };
  assert.equal(gradeAnswer(q, ['c', 'a']).points_awarded, 2);
  assert.equal(gradeAnswer(q, ['a']).points_awarded, 0);
  assert.equal(gradeAnswer(q, ['a', 'b', 'c']).points_awarded, 0);
  assert.equal(gradeAnswer(q, 'a').points_awarded, 0);
});

t('multi: single correct option works', () => {
  const q = { type: 'multi', correct: ['b'], points: 1, partial: false };
  assert.equal(gradeAnswer(q, ['b']).is_correct, true);
});

t('multi: partial credit', () => {
  const q = { type: 'multi', correct: ['a', 'b', 'c', 'd'], points: 4, partial: true };
  assert.equal(gradeAnswer(q, ['a', 'b']).points_awarded, 2);
  assert.equal(gradeAnswer(q, ['a', 'b', 'x']).points_awarded, 1);
  assert.equal(gradeAnswer(q, ['x', 'y']).points_awarded, 0); // never negative
  assert.equal(gradeAnswer(q, ['a', 'b', 'c', 'd']).is_correct, true);
});

const essay = {
  type: 'essay',
  points: 4,
  correct: {
    keywords: [{ words: ['because', 'due to'] }, { words: ['climate'] }, { words: ['trade'] }, { words: ['growth'] }],
    min_words: 5,
  },
};

t('essay: full match, case and punctuation insensitive', () => {
  const g = gradeAnswer(essay, 'It happened, DUE TO the Climate; trade, and growth!');
  assert.equal(g.points_awarded, 4);
  assert.equal(g.is_correct, true);
});

t('essay: partial match lists missing ideas', () => {
  const g = gradeAnswer(essay, 'It happened because of climate and other things here');
  assert.equal(g.points_awarded, 2);
  assert.match(g.feedback, /Missing: trade, growth/);
});

t('essay: whole-word matching (no substring hits)', () => {
  const g = gradeAnswer(essay, 'The tradesman climbed the climatology tower growing fast');
  assert.equal(g.points_awarded, 0);
});

t('essay: too short and blank', () => {
  assert.equal(gradeAnswer(essay, 'climate trade').points_awarded, 0);
  assert.match(gradeAnswer(essay, 'climate trade').feedback, /Too short/);
  assert.equal(gradeAnswer(essay, '   ').points_awarded, 0);
});

t('essay: no keywords -> needs manual grading (null)', () => {
  const g = gradeAnswer({ type: 'essay', points: 3, correct: { keywords: [] } }, 'anything');
  assert.equal(g.points_awarded, null);
});

t('essay: Arabic text matches', () => {
  const q = { type: 'essay', points: 1, correct: { keywords: [{ words: ['المناخ'] }] } };
  assert.equal(gradeAnswer(q, 'تأثر الاقتصاد بسبب المناخ كثيرا').points_awarded, 1);
});

t('gradeAttempt: totals and ungraded flag', () => {
  const qs = [
    { id: 'q1', type: 'single', correct: 'a', points: 1 },
    { id: 'q2', type: 'true_false', correct: false, points: 2 },
    { id: 'q3', type: 'essay', points: 3, correct: { keywords: [] } },
  ];
  const r = gradeAttempt(qs, { q1: 'a', q2: true, q3: 'free text' });
  assert.equal(r.score, 1);
  assert.equal(r.max_score, 6);
  assert.equal(r.hasUngraded, true);
  assert.equal(r.answers.length, 3);
  const r2 = gradeAttempt(qs.slice(0, 2), { q1: 'a', q2: false });
  assert.equal(r2.score, 3);
  assert.equal(r2.hasUngraded, false);
});

t('countWords', () => {
  assert.equal(countWords('  one, two  three. '), 3);
  assert.equal(countWords(''), 0);
});

console.log('\nAll quiz-grade tests passed.');
