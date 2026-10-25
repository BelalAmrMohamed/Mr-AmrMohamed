// server/_lib/quiz-grade.js
// Pure grading functions (no I/O) so they can be unit-tested with plain node.
//
// Question shapes (as stored in quiz_questions):
//   single:     options=[{id,text}]  correct="<optionId>"
//   multi:      options=[{id,text}]  correct=["<optionId>", ...]   partial=true|false
//   true_false: options=null         correct=true|false
//   essay:      options=null         correct={ keywords:[{words:["a","b"]}], min_words:0 }
//
// gradeAnswer() returns { is_correct, points_awarded, feedback }.
// points_awarded === null means "cannot be auto-graded" (essay with no keywords).

const round2 = (n) => Math.round(n * 100) / 100;
const pointsOf = (q) => (Number.isFinite(Number(q.points)) ? Number(q.points) : 1);

/** Lowercase, strip punctuation (Unicode-aware, so Arabic works too), collapse spaces. */
export function normalizeText(s) {
  return String(s ?? '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

export function countWords(s) {
  const n = normalizeText(s);
  return n ? n.split(' ').length : 0;
}

function toBool(v) {
  if (v === true || v === 'true') return true;
  if (v === false || v === 'false') return false;
  return null;
}

function gradeEssay(q, answer) {
  const cfg = q.correct && typeof q.correct === 'object' ? q.correct : {};
  const groups = (Array.isArray(cfg.keywords) ? cfg.keywords : [])
    .map((g) => (Array.isArray(g?.words) ? g.words.map(normalizeText).filter(Boolean) : []))
    .filter((w) => w.length);
  const minWords = Math.max(0, Number(cfg.min_words) || 0);
  const text = typeof answer === 'string' ? answer : '';
  const max = pointsOf(q);

  if (!groups.length) {
    return { is_correct: null, points_awarded: null, feedback: 'Needs manual grading.' };
  }
  if (!normalizeText(text)) {
    return { is_correct: false, points_awarded: 0, feedback: 'No answer.' };
  }
  const words = countWords(text);
  if (words < minWords) {
    return {
      is_correct: false,
      points_awarded: 0,
      feedback: `Too short: ${words} of at least ${minWords} words.`,
    };
  }

  const haystack = ` ${normalizeText(text)} `;
  const matched = [];
  const missing = [];
  for (const g of groups) {
    (g.some((w) => haystack.includes(` ${w} `)) ? matched : missing).push(g[0]);
  }
  const frac = matched.length / groups.length;
  let feedback = `Matched ${matched.length} of ${groups.length} key ideas.`;
  if (missing.length) feedback += ` Missing: ${missing.join(', ')}.`;
  return { is_correct: frac === 1, points_awarded: round2(max * frac), feedback };
}

export function gradeAnswer(q, answer) {
  const max = pointsOf(q);
  const wrong = { is_correct: false, points_awarded: 0, feedback: null };
  const right = { is_correct: true, points_awarded: max, feedback: null };

  switch (q.type) {
    case 'single':
      return typeof answer === 'string' && answer === q.correct ? right : wrong;

    case 'true_false': {
      const given = toBool(answer);
      return given !== null && given === toBool(q.correct) ? right : wrong;
    }

    case 'multi': {
      const correct = new Set(Array.isArray(q.correct) ? q.correct : []);
      const picked = new Set(Array.isArray(answer) ? answer.filter((x) => typeof x === 'string') : []);
      let hit = 0;
      let miss = 0;
      for (const id of picked) (correct.has(id) ? hit++ : miss++);
      if (hit === correct.size && miss === 0 && correct.size > 0) return right;
      if (q.partial && correct.size > 0) {
        const frac = Math.max(0, (hit - miss) / correct.size);
        return { is_correct: false, points_awarded: round2(max * frac), feedback: null };
      }
      return wrong;
    }

    case 'essay':
      return gradeEssay(q, answer);

    default:
      return { is_correct: null, points_awarded: null, feedback: 'Unknown question type.' };
  }
}

/**
 * Grades a whole attempt.
 * @param questions rows from quiz_questions
 * @param answers   { [questionId]: answerValue }
 * @returns { answers:[{question_id, answer, is_correct, points_awarded, feedback}], score, max_score, hasUngraded }
 */
export function gradeAttempt(questions, answers) {
  let score = 0;
  let max = 0;
  let hasUngraded = false;
  const rows = questions.map((q) => {
    const answer = answers?.[q.id] ?? null;
    const g = gradeAnswer(q, answer);
    max += pointsOf(q);
    if (g.points_awarded === null) hasUngraded = true;
    else score += g.points_awarded;
    return { question_id: q.id, answer, ...g };
  });
  return { answers: rows, score: round2(score), max_score: round2(max), hasUngraded };
}
