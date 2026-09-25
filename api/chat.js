// api/chat.js
// Serverless proxy between the browser and Google AI Studio (Gemini).
// The API key(s) never reach the client. This is a plain Vercel Node
// serverless function (no framework) — export a default handler.

const MODEL = 'gemini-flash-lite-latest';
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// ---------------------------------------------------------------------
// Keys: PUBLIC_ASSISTANT_GEMINI_API_KEYS="key_1,key_2,key_3"
// We rotate on quota/5xx errors so one exhausted key doesn't take the
// assistant down.
// ---------------------------------------------------------------------
function getKeys() {
  const raw = process.env.PUBLIC_ASSISTANT_GEMINI_API_KEYS || '';
  return raw.split(',').map((k) => k.trim()).filter(Boolean);
}

const TEACHER = {
  name: 'Amr Mohamed Ahmed',
  title: 'Senior English Language Expert & AUC Certified Trainer',
  email: 'amr.671390@t2.moe.edu.eg',
  whatsapp: 'https://wa.me/201205452322',
  telegram: 'https://t.me/01024394486',
  linkedin: 'https://www.linkedin.com/in/amr-mohammed-94694435b/',
  sampleVideo: 'https://youtu.be/EaqgiH3RU_4',
};

// ---------------------------------------------------------------------
// System instruction: identity + behavioral guidance for the tool
// system. Keeping this centralized (rather than duplicated on the
// client) means the assistant's "personality" only lives in one place.
// ---------------------------------------------------------------------
const SYSTEM_INSTRUCTION = `You are the AI assistant embedded on Mr. Amr Mohamed's English-teaching website.
Mr. Amr: ${TEACHER.title}, 32 years of experience, IELTS/TOEFL specialist, Ministry of Education (Egypt) English Language Supervisor.

You have two jobs:
1. Help visitors learn about Mr. Amr and get in touch with him.
2. Act as an English-learning assistant: explain grammar, build vocabulary, correct writing, run quizzes, practice conversation, translate, help with pronunciation, and more.

Tool usage rules:
- Use "contact_mr_amr" whenever a user wants to reach Mr. Amr (booking a class, asking a question only he can answer, WhatsApp/email/etc). Pass only the methods that make sense.
- Use "show_teacher_image" when a user wants to see what Mr. Amr looks like or asks for his photo.
- Use "show_youtube_video" to recommend the sample lesson (${TEACHER.sampleVideo}) or another relevant, real, publicly known YouTube video when it would help — only use a URL you are confident is real; never invent a video ID.
- Use "render_component" whenever an interactive/visual element would teach or engage better than plain text. For practice and quizzes, prefer an interactive component over a wall of text.
- QUIZ MODE IS INTERACTIVE: If a user asks for a quiz or multiple practice questions (e.g. "quiz me on 5 words"), you MUST generate every question in ONE SINGLE "render_component" call using type "quiz" with a "questions" array — never call "render_component" multiple times (once per question) in the same turn, and never send one question, wait for an answer, then send the next. The whole quiz is built once, up front. Give the quiz a stable "quizId", the full "totalQuestions", and every question's full data inside "questions". The UI handles showing one question at a time, scoring, and navigation — you do not need to send follow-up questions yourself. Only after the student finishes the entire quiz (you will receive an interactive learning event with the final score and answers) should you respond with a short encouraging wrap-up. Do not call "render_component" again for the same quiz after that — just reply in text. Do not reveal correct answers before the student answers.
- For a "quiz" component's data, use: {"quizId": "...", "totalQuestions": N, "questions": [{"type": "mcq", "question": "...", "options": ["..."], "correctIndex": 0, "explanation": "..."}, {"type": "fill_blank", "prompt": "...", "answers": ["..."], "explanation": "..."}, ...]}. Mix "mcq" and "fill_blank" question types only if it fits the request; otherwise keep them consistent.
- If the user asks for a single practice question, render one "mcq" or "fill_blank" component and stop; do not invent a multi-question session.
- Do not call a tool just to say hello. Reserve tools for moments that clearly call for them.
- Keep replies concise, warm, and encouraging. Match the student's language (Arabic or English) and level.
- When correcting writing, first restate the type of mistake in plain terms, then explain, then optionally give the corrected version.
- Never fabricate facts about Mr. Amr beyond what you were told above; if unsure, suggest the user contact him directly.`;

// ---------------------------------------------------------------------
// Tool (function) declarations — the modular "AI Tools" system.
// To add a new tool: add a declaration here AND a matching case in
// public/assets/ai/tools.js on the client. That's the whole contract.
// ---------------------------------------------------------------------
const TOOLS = [
  {
    functionDeclarations: [
      {
        name: 'contact_mr_amr',
        description:
          "Show real, clickable contact buttons for Mr. Amr (WhatsApp, Email, Telegram, LinkedIn). Use whenever the visitor wants to reach him directly.",
        parameters: {
          type: 'object',
          properties: {
            methods: {
              type: 'array',
              description: 'Which contact methods to show. Defaults to all if omitted.',
              items: { type: 'string', enum: ['whatsapp', 'email', 'telegram', 'linkedin'] },
            },
            reason: {
              type: 'string',
              description: 'One short sentence on why you are showing these (shown above the buttons).',
            },
          },
        },
      },
      {
        name: 'show_youtube_video',
        description: 'Embed a real, relevant YouTube video directly in the chat as a player.',
        parameters: {
          type: 'object',
          properties: {
            video_url: { type: 'string', description: 'Full YouTube URL, e.g. https://youtu.be/XXXXXXXXXXX' },
            title: { type: 'string', description: 'Short human-readable caption for the video.' },
          },
          required: ['video_url'],
        },
      },
      {
        name: 'show_teacher_image',
        description: "Show Mr. Amr's photo inside the conversation.",
        parameters: {
          type: 'object',
          properties: {
            caption: { type: 'string', description: 'Optional short caption under the photo.' },
          },
        },
      },
      {
        name: 'render_component',
        description:
          'Render an interactive learning component inline in the chat instead of plain text. Choose the type that fits the current exercise.',
        parameters: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: [
                'mcq',
                'fill_blank',
                'quiz',
                'flashcards',
                'vocab_card',
                'grammar_card',
                'progress',
                'pronunciation_card',
                'lesson_card',
                'buttons',
              ],
              description: 'Which interactive component to render. Use "quiz" to render every question of a multi-question quiz at once — the UI tracks and displays the score itself, so there is no separate quiz-summary component.',
            },
            data: {
              type: 'object',
              description:
                'Component payload. Shape depends on type, e.g. {"question":"...","options":["a","b","c"],"correctIndex":1,"explanation":"..."} for a single mcq; {"quizId":"...","totalQuestions":5,"questions":[{"type":"mcq","question":"...","options":["..."],"correctIndex":0,"explanation":"..."},{"type":"fill_blank","prompt":"...","answers":["..."],"explanation":"..."}]} for quiz (ALL questions generated up front); {"cards":[{"front":"...","back":"..."}]} for flashcards; {"word":"...","definition":"...","examples":["..."],"synonyms":["..."],"antonyms":["..."],"collocations":["..."]} for vocab_card; {"level":"B1","label":"..."} for progress. Always pass valid JSON matching the type.',
            },
          },
          required: ['type', 'data'],
        },
      },
    ],
  },
];

function buildUrl(key) {
  return `${API_BASE}/${MODEL}:generateContent?key=${encodeURIComponent(key)}`;
}

async function callGemini(body, keys) {
  let lastError = null;
  for (const key of keys) {
    try {
      const resp = await fetch(buildUrl(key), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (resp.ok) {
        return await resp.json();
      }
      // Rotate to next key on rate-limit / auth / server errors.
      if ([401, 403, 429, 500, 503].includes(resp.status)) {
        lastError = new Error(`Gemini ${resp.status}: ${await resp.text()}`);
        continue;
      }
      lastError = new Error(`Gemini ${resp.status}: ${await resp.text()}`);
      break;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error('No Gemini API keys configured.');
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
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

  const keys = getKeys();
  if (!keys.length) {
    res.status(500).json({ error: 'AI assistant is not configured (missing API key).' });
    return;
  }

  let payload;
  try {
    payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    res.status(400).json({ error: 'Invalid JSON body.' });
    return;
  }

  const contents = Array.isArray(payload?.contents) ? payload.contents : null;
  if (!contents || !contents.length) {
    res.status(400).json({ error: 'Missing "contents".' });
    return;
  }
  // Basic guardrails so a single request can't run away.
  if (contents.length > 60) {
    res.status(400).json({ error: 'Conversation too long for a single request.' });
    return;
  }

  const body = {
    contents,
    tools: TOOLS,
    systemInstruction: { role: 'system', parts: [{ text: SYSTEM_INSTRUCTION }] },
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
    },
  };

  try {
    const data = await callGemini(body, keys);
    const candidate = data?.candidates?.[0];
    if (!candidate) {
      res.status(502).json({ error: 'The assistant did not return a response.', raw: data });
      return;
    }
    res.status(200).json({
      content: candidate.content || null,
      finishReason: candidate.finishReason || null,
    });
  } catch (err) {
    res.status(502).json({ error: err.message || 'Failed to reach the assistant.' });
  }
}