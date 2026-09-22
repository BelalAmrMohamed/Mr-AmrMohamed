// public\ai\tools.js — the client half of the modular tool system.
// The server (api/chat.js) declares what tools the model *may* call.
// This file declares what happens when it *does* call one: each entry
// is a pure function (toolCall.args, helpers) -> HTMLElement.
//
// To add a new tool: declare it in api/chat.js's TOOLS array, then add
// a matching entry to RENDERERS (for a bespoke tool) or teach
// renderComponent() a new `type` (for something that fits the generic
// interactive-component tool). Nothing else in the app needs to change.

const CONTACT_METHODS = {
  whatsapp: {
    label: 'WhatsApp',
    href: 'https://wa.me/201550899245',
    icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.46-2.4-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.44-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.87 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35Zm-5.42 7.4h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.88 9.88ZM20.47 3.53A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.23-6.16-3.47-8.4Z"/></svg>',
  },
  email: {
    label: 'Email',
    href: 'mailto:amr.671390@t2.moe.edu.eg',
    icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M2 4h20v16H2V4Zm2 2v.01L12 12l8-5.99V6H4Zm16 2.24-7.4 5.55a1 1 0 0 1-1.2 0L4 8.24V18h16V8.24Z"/></svg>',
  },
  telegram: {
    label: 'Telegram',
    href: 'https://t.me/01024394486',
    icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.94 3.6 2.87 11.07c-1.3.53-1.3 1.27-.24 1.6l4.9 1.53 1.9 5.84c.23.63.4.88.82.88.35 0 .5-.16.7-.36l1.68-1.63 3.5 2.58c.64.36 1.1.17 1.27-.6l2.3-10.87c.25-1.08-.4-1.57-1.06-1.24ZM8.83 13.7l9.36-5.9c.44-.27.84-.12.51.18l-7.99 7.2-.32 3.5-1.56-4.98Z"/></svg>',
  },
  linkedin: {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/in/amr-mohammed-94694435b/',
    icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45Z"/></svg>',
  },
};

function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function escapeHtml(s = '') {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// --- bespoke tool renderers -------------------------------------------------

function renderContact(args) {
  const methods = Array.isArray(args?.methods) && args.methods.length ? args.methods : Object.keys(CONTACT_METHODS);
  const wrap = el(`<div class="ai-card ai-contact-card"></div>`);
  if (args?.reason) wrap.append(el(`<p class="ai-card-reason">${escapeHtml(args.reason)}</p>`));
  const row = el('<div class="ai-contact-row"></div>');
  methods.forEach((key) => {
    const m = CONTACT_METHODS[key];
    if (!m) return;
    const a = el(
      `<a class="ai-contact-btn ai-contact-${key}" href="${m.href}" target="_blank" rel="noopener noreferrer">${m.icon}<span>${m.label}</span></a>`
    );
    row.append(a);
  });
  wrap.append(row);
  return wrap;
}

function youtubeId(url = '') {
  const m = url.match(/(?:youtu\.be\/|v=|embed\/)([\w-]{6,})/);
  return m ? m[1] : null;
}

function renderVideo(args) {
  const id = youtubeId(args?.video_url || '');
  const wrap = el(`<div class="ai-card ai-video-card"></div>`);
  if (args?.title) wrap.append(el(`<p class="ai-card-reason">${escapeHtml(args.title)}</p>`));
  if (id) {
    wrap.append(
      el(`<div class="ai-video-frame"><iframe src="https://www.youtube.com/embed/${id}" title="${escapeHtml(
        args?.title || 'Video'
      )}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`)
    );
  } else {
    wrap.append(el(`<a href="${args?.video_url || '#'}" target="_blank" rel="noopener noreferrer">Watch on YouTube</a>`));
  }
  return wrap;
}

function renderTeacherImage(args) {
  const wrap = el(`<div class="ai-card ai-image-card"></div>`);
  wrap.append(el(`<img src="/assets/images/profile.jpg" alt="Amr Mohamed Ahmed" loading="lazy">`));
  if (args?.caption) wrap.append(el(`<p class="ai-card-caption">${escapeHtml(args.caption)}</p>`));
  return wrap;
}

// --- generic interactive-component renderer --------------------------------

function renderMcq(data, ctx) {
  const wrap = el(`<div class="ai-card ai-mcq-card"></div>`);
  const meta = data.totalQuestions
    ? `Question ${data.questionNumber || 1} of ${data.totalQuestions}`
    : '';
  if (meta) wrap.append(el(`<div class="ai-component-meta">${escapeHtml(meta)}</div>`));
  wrap.append(el(`<p class="ai-mcq-question">${escapeHtml(data.question || '')}</p>`));
  const scoreBefore = Number.isFinite(Number(data.scoreBefore)) ? Number(data.scoreBefore) : 0;
  const score = el(`<div class="ai-component-score">Score: ${scoreBefore}</div>`);
  wrap.append(score);

  const list = el('<div class="ai-mcq-options" role="listbox"></div>');
  (data.options || []).forEach((opt, i) => {
    const btn = el(`<button type="button" class="ai-mcq-option" data-i="${i}">${escapeHtml(opt)}</button>`);
    btn.addEventListener('click', () => {
      if (list.dataset.answered) return;
      list.dataset.answered = '1';
      const correct = i === data.correctIndex;
      const scoreAfter = scoreBefore + (correct ? 1 : 0);
      [...list.children].forEach((c, ci) => {
        c.disabled = true;
        if (ci === data.correctIndex) c.classList.add('is-correct');
      });
      if (!correct) btn.classList.add('is-wrong');
      score.textContent = `Score: ${scoreAfter} / ${data.questionNumber || 1}`;
      if (data.explanation) {
        wrap.append(el(`<p class="ai-mcq-explanation">${escapeHtml(data.explanation)}</p>`));
      }
      ctx?.onInteract?.({
        correct,
        answer: opt,
        answerIndex: i,
        scoreBefore,
        scoreAfter,
        questionNumber: data.questionNumber ?? null,
        totalQuestions: data.totalQuestions ?? null,
      });
    });
    list.append(btn);
  });
  wrap.append(list);
  return wrap;
}

function renderFillBlank(data, ctx) {
  const wrap = el(`<div class="ai-card ai-fillblank-card"></div>`);
  if (data.totalQuestions) {
    wrap.append(el(`<div class="ai-component-meta">Question ${escapeHtml(String(data.questionNumber || 1))} of ${escapeHtml(String(data.totalQuestions))}</div>`));
  }
  wrap.append(el(`<p class="ai-fillblank-prompt">${escapeHtml(data.prompt || '')}</p>`));
  const scoreBefore = Number.isFinite(Number(data.scoreBefore)) ? Number(data.scoreBefore) : 0;
  const score = el(`<div class="ai-component-score">Score: ${scoreBefore}</div>`);
  const form = el('<form class="ai-fillblank-form"></form>');
  const input = el(`<input type="text" class="ai-fillblank-input" placeholder="Type your answer" dir="auto" autocomplete="off">`);
  const submit = el('<button type="submit" class="ai-btn-mini">Check</button>');
  form.append(input, submit);
  const result = el('<p class="ai-fillblank-result" hidden></p>');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const answers = (Array.isArray(data.answers) ? data.answers : [data.answer])
      .filter(Boolean)
      .map((answer) => answer.trim().toLowerCase());
    const answer = input.value.trim();
    const correct = answers.includes(answer.toLowerCase());
    const scoreAfter = scoreBefore + (correct ? 1 : 0);
    result.hidden = false;
    result.textContent = correct
      ? 'Correct! ' + (data.explanation || '')
      : `Not quite. Correct answer: ${answers[0] || ''}. ${data.explanation || ''}`;
    result.className = `ai-fillblank-result ${correct ? 'is-correct' : 'is-wrong'}`;
    score.textContent = `Score: ${scoreAfter} / ${data.questionNumber || 1}`;
    input.disabled = true;
    submit.disabled = true;
    ctx?.onInteract?.({
      correct,
      answer,
      scoreBefore,
      scoreAfter,
      questionNumber: data.questionNumber ?? null,
      totalQuestions: data.totalQuestions ?? null,
    });
  });
  wrap.append(score, form, result);
  return wrap;
}

function renderQuiz(data, ctx) {
  const questions = Array.isArray(data.questions) ? data.questions : [];
  const total = data.totalQuestions || questions.length;
  const wrap = el(`<div class="ai-card ai-quiz-card"></div>`);
  const meta = el(`<div class="ai-component-meta"></div>`);
  const score = el(`<div class="ai-component-score"></div>`);
  const body = el(`<div class="ai-quiz-body"></div>`);
  const nextWrap = el(`<div class="ai-quiz-next" hidden></div>`);
  const nextBtn = el(`<button type="button" class="ai-btn-mini ai-btn-primary">Next question</button>`);
  nextWrap.append(nextBtn);
  wrap.append(meta, score, body, nextWrap);

  let index = 0;
  let correctCount = 0;
  const answers = [];

  function updateMeta() {
    meta.textContent = `Question ${index + 1} of ${total}`;
    score.textContent = `Score: ${correctCount} / ${index}`;
  }

  function renderQuestion() {
    body.innerHTML = '';
    nextWrap.hidden = true;
    const q = questions[index] || {};
    updateMeta();

    if (q.type === 'fill_blank') {
      body.append(el(`<p class="ai-fillblank-prompt">${escapeHtml(q.prompt || '')}</p>`));
      const form = el('<form class="ai-fillblank-form"></form>');
      const input = el(`<input type="text" class="ai-fillblank-input" placeholder="Type your answer" dir="auto" autocomplete="off">`);
      const submit = el('<button type="submit" class="ai-btn-mini">Check</button>');
      form.append(input, submit);
      const result = el('<p class="ai-fillblank-result" hidden></p>');
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const validAnswers = (Array.isArray(q.answers) ? q.answers : [q.answer])
          .filter(Boolean)
          .map((a) => a.trim().toLowerCase());
        const answer = input.value.trim();
        const correct = validAnswers.includes(answer.toLowerCase());
        finishQuestion(q, correct, answer, result, () => {
          result.hidden = false;
          result.textContent = correct
            ? 'Correct! ' + (q.explanation || '')
            : `Not quite. Correct answer: ${validAnswers[0] || ''}. ${q.explanation || ''}`;
          result.className = `ai-fillblank-result ${correct ? 'is-correct' : 'is-wrong'}`;
          input.disabled = true;
          submit.disabled = true;
        });
      });
      body.append(form, result);
    } else {
      body.append(el(`<p class="ai-mcq-question">${escapeHtml(q.question || '')}</p>`));
      const list = el('<div class="ai-mcq-options" role="listbox"></div>');
      (q.options || []).forEach((opt, i) => {
        const btn = el(`<button type="button" class="ai-mcq-option" data-i="${i}">${escapeHtml(opt)}</button>`);
        btn.addEventListener('click', () => {
          if (list.dataset.answered) return;
          list.dataset.answered = '1';
          const correct = i === q.correctIndex;
          [...list.children].forEach((c, ci) => {
            c.disabled = true;
            if (ci === q.correctIndex) c.classList.add('is-correct');
          });
          if (!correct) btn.classList.add('is-wrong');
          finishQuestion(q, correct, opt, list, () => {
            if (q.explanation) body.append(el(`<p class="ai-mcq-explanation">${escapeHtml(q.explanation)}</p>`));
          });
        });
        list.append(btn);
      });
      body.append(list);
    }
  }

  function finishQuestion(q, correct, answer, _resultNode, applyUi) {
    if (correct) correctCount += 1;
    answers.push({ question: q.question || q.prompt || '', correct, answer });
    applyUi();
    score.textContent = `Score: ${correctCount} / ${index + 1}`;
    const isLast = index === questions.length - 1;
    if (!isLast) {
      nextWrap.hidden = false;
    } else {
      wrap.append(el(`<p class="ai-quiz-done">Quiz complete! Final score: ${correctCount} / ${questions.length}</p>`));
      ctx?.onInteract?.({
        quizComplete: true,
        correct: correctCount,
        total: questions.length,
        answers,
        quizId: data.quizId || null,
      });
    }
  }

  nextBtn.addEventListener('click', () => {
    index += 1;
    renderQuestion();
  });

  if (questions.length) renderQuestion();
  else body.append(el(`<p>No questions were generated.</p>`));

  return wrap;
}

function renderFlashcards(data) {
  const cards = Array.isArray(data.cards) ? data.cards : [];
  const wrap = el(`<div class="ai-card ai-flashcards-card"></div>`);
  let i = 0;
  const stage = el('<div class="ai-flashcard" tabindex="0" role="button" aria-label="Flip card"></div>');
  const front = el(`<div class="ai-flashcard-face ai-flashcard-front"></div>`);
  const back = el(`<div class="ai-flashcard-face ai-flashcard-back"></div>`);
  stage.append(front, back);
  const counter = el(`<span class="ai-flashcard-counter"></span>`);
  const nav = el(`<div class="ai-flashcard-nav">
      <button type="button" class="ai-btn-mini" data-act="known">Known</button>
      <button type="button" class="ai-btn-mini" data-act="prev">◀</button>
      <button type="button" class="ai-btn-mini" data-act="next">▶</button>
      <button type="button" class="ai-btn-mini" data-act="unknown">Review again</button>
    </div>`);

  function render() {
    const c = cards[i] || { front: '—', back: '—' };
    front.textContent = c.front;
    back.textContent = c.back;
    stage.classList.remove('is-flipped');
    counter.textContent = `${cards.length ? i + 1 : 0} / ${cards.length}`;
  }
  stage.addEventListener('click', () => stage.classList.toggle('is-flipped'));
  stage.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' || e.key === ' ') stage.classList.toggle('is-flipped');
  });
  nav.addEventListener('click', (e) => {
    const act = e.target.closest('button')?.dataset.act;
    if (!act) return;
    if (act === 'next' || act === 'known' || act === 'unknown') i = Math.min(i + 1, cards.length - 1);
    if (act === 'prev') i = Math.max(i - 1, 0);
    render();
  });
  render();
  wrap.append(stage, counter, nav);
  return wrap;
}

function renderVocabCard(data) {
  const wrap = el(`<div class="ai-card ai-vocab-card"></div>`);
  wrap.append(el(`<p class="ai-vocab-word">${escapeHtml(data.word || '')}</p>`));
  if (data.definition) wrap.append(el(`<p class="ai-vocab-def">${escapeHtml(data.definition)}</p>`));
  const rowList = (label, arr) => {
    if (!arr?.length) return null;
    return el(`<p class="ai-vocab-row"><strong>${label}:</strong> ${escapeHtml(arr.join(', '))}</p>`);
  };
  [
    rowList('Examples', data.examples),
    rowList('Synonyms', data.synonyms),
    rowList('Antonyms', data.antonyms),
    rowList('Collocations', data.collocations),
  ]
    .filter(Boolean)
    .forEach((n) => wrap.append(n));
  return wrap;
}

function renderGrammarCard(data) {
  const wrap = el(`<div class="ai-card ai-grammar-card"></div>`);
  wrap.append(el(`<p class="ai-grammar-title">${escapeHtml(data.title || 'Grammar point')}</p>`));
  if (data.explanation) wrap.append(el(`<p>${escapeHtml(data.explanation)}</p>`));
  if (data.examples?.length) {
    const ul = el('<ul class="ai-grammar-examples"></ul>');
    data.examples.forEach((ex) => ul.append(el(`<li>${escapeHtml(ex)}</li>`)));
    wrap.append(ul);
  }
  if (data.commonMistakes?.length) {
    wrap.append(el(`<p class="ai-grammar-mistakes-title">Common mistakes</p>`));
    const ul = el('<ul class="ai-grammar-examples"></ul>');
    data.commonMistakes.forEach((ex) => ul.append(el(`<li>${escapeHtml(ex)}</li>`)));
    wrap.append(ul);
  }
  return wrap;
}

function renderQuizSummary(data) {
  const total = data.total ?? 0;
  const correct = data.correct ?? 0;
  const pct = total ? Math.round((correct / total) * 100) : 0;
  const wrap = el(`<div class="ai-card ai-quiz-summary"></div>`);
  wrap.append(el(`<p class="ai-quiz-score">${correct} / ${total}</p>`));
  wrap.append(el(`<div class="ai-progress-track"><div class="ai-progress-fill" style="width:${pct}%"></div></div>`));
  if (data.message) wrap.append(el(`<p>${escapeHtml(data.message)}</p>`));
  return wrap;
}

function renderProgress(data) {
  const wrap = el(`<div class="ai-card ai-progress-card"></div>`);
  wrap.append(el(`<p class="ai-progress-label">${escapeHtml(data.label || 'Level')}: <strong>${escapeHtml(data.level || '')}</strong></p>`));
  if (typeof data.percent === 'number') {
    wrap.append(el(`<div class="ai-progress-track"><div class="ai-progress-fill" style="width:${Math.max(0, Math.min(100, data.percent))}%"></div></div>`));
  }
  return wrap;
}

function renderPronunciationCard(data) {
  const wrap = el(`<div class="ai-card ai-pronunciation-card"></div>`);
  wrap.append(el(`<p class="ai-pron-word">${escapeHtml(data.word || data.text || '')}</p>`));
  if (data.ipa) wrap.append(el(`<p class="ai-pron-ipa">/${escapeHtml(data.ipa)}/</p>`));
  const btn = el('<button type="button" class="ai-btn-mini">🔊 Listen</button>');
  btn.addEventListener('click', () => {
    const u = new SpeechSynthesisUtterance(data.text || data.word || '');
    u.lang = /[\u0600-\u06FF]/.test(u.text) ? 'ar-EG' : 'en-US';
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  });
  wrap.append(btn);
  return wrap;
}

function renderLessonCard(data) {
  const wrap = el(`<div class="ai-card ai-lesson-card"></div>`);
  wrap.append(el(`<p class="ai-lesson-title">${escapeHtml(data.title || '')}</p>`));
  if (data.description) wrap.append(el(`<p>${escapeHtml(data.description)}</p>`));
  if (data.url) wrap.append(el(`<a class="ai-btn-mini" href="${data.url}" target="_blank" rel="noopener noreferrer">Open</a>`));
  return wrap;
}

function renderButtons(data) {
  const wrap = el(`<div class="ai-card ai-buttons-card"></div>`);
  const row = el('<div class="ai-contact-row"></div>');
  (data.buttons || []).forEach((b) => {
    row.append(el(`<a class="ai-contact-btn" href="${b.url || '#'}" target="_blank" rel="noopener noreferrer"><span>${escapeHtml(b.label || 'Open')}</span></a>`));
  });
  wrap.append(row);
  return wrap;
}

const COMPONENT_RENDERERS = {
  mcq: renderMcq,
  fill_blank: renderFillBlank,
  quiz: renderQuiz,
  flashcards: renderFlashcards,
  vocab_card: renderVocabCard,
  grammar_card: renderGrammarCard,
  quiz_summary: renderQuizSummary,
  progress: renderProgress,
  pronunciation_card: renderPronunciationCard,
  lesson_card: renderLessonCard,
  buttons: renderButtons,
};

const RENDERERS = {
  contact_mr_amr: (args) => renderContact(args),
  show_youtube_video: (args) => renderVideo(args),
  show_teacher_image: (args) => renderTeacherImage(args),
  render_component: (args, ctx) => {
    const fn = COMPONENT_RENDERERS[args?.type];
    if (!fn) return el(`<div class="ai-card">Unsupported component: ${escapeHtml(args?.type || '')}</div>`);
    try {
      return fn(args.data || {}, ctx);
    } catch (err) {
      console.error('[ai-chat] component render failed', err);
      return el(`<div class="ai-card">Could not render this component.</div>`);
    }
  },
};

/** Renders a single tool call into a DOM node. Returns null if the tool is unknown. */
export function renderToolCall(name, args, ctx) {
  const fn = RENDERERS[name];
  if (!fn) return null;
  return fn(args || {}, ctx || {});
}

export const KNOWN_TOOLS = Object.keys(RENDERERS);