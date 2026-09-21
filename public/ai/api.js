// public\ai\api.js — talks to /api/chat and drives the tool-call loop.
// Gemini's "contents" format: [{ role: 'user'|'model', parts: [...] }]

const ENDPOINT = '/api/chat';
const MAX_TOOL_ROUNDS = 4;

function textPart(text) {
  return { text };
}

/** Converts our stored chat messages into Gemini `contents`. */
export function historyToContents(messages) {
  const contents = [];
  for (const m of messages) {
    if (m.role === 'user') {
      contents.push({ role: 'user', parts: [textPart(m.text)] });
    } else {
      const parts = [];
      if (m.text) parts.push(textPart(m.text));
      if (m.toolCalls?.length) {
        for (const tc of m.toolCalls) {
          parts.push({ functionCall: { name: tc.name, args: tc.args } });
        }
      }
      contents.push({ role: 'model', parts: parts.length ? parts : [textPart('')] });
      if (m.toolCalls?.length) {
        contents.push({
          role: 'user',
          parts: m.toolCalls.map((tc) => ({
            functionResponse: { name: tc.name, response: { status: 'rendered' } },
          })),
        });
      }
    }
  }
  return contents;
}

async function requestOnce(contents) {
  const resp = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents }),
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data?.error || `Request failed (${resp.status})`);
  }
  return data;
}

/**
 * Sends the full conversation (as Gemini contents) and resolves the
 * loop of functionCall -> functionResponse until the model produces a
 * final text answer (or MAX_TOOL_ROUNDS is hit).
 *
 * onToolCall(name, args) is called synchronously for each tool call so
 * the UI can render it immediately, in order.
 *
 * Returns { text, toolCalls } for the final model turn.
 */
export async function sendMessage(contents, { onToolCall } = {}) {
  const working = contents.slice();
  const collectedToolCalls = [];
  let finalText = '';

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const data = await requestOnce(working);
    const parts = data.content?.parts || [];
    const calls = parts.filter((p) => p.functionCall).map((p) => p.functionCall);
    const text = parts
      .filter((p) => p.text)
      .map((p) => p.text)
      .join('');

    if (!calls.length) {
      finalText = text;
      break;
    }

    for (const call of calls) {
      collectedToolCalls.push(call);
      onToolCall?.(call.name, call.args);
    }

    // Append the model's turn (with function calls) and our function
    // responses, then loop for the model's follow-up.
    working.push({
      role: 'model',
      parts: [...(text ? [textPart(text)] : []), ...calls.map((c) => ({ functionCall: { name: c.name, args: c.args } }))],
    });
    working.push({
      role: 'user',
      parts: calls.map((c) => ({ functionResponse: { name: c.name, response: { status: 'rendered' } } })),
    });

    if (round === MAX_TOOL_ROUNDS - 1) {
      finalText = text;
    }
  }

  return { text: finalText, toolCalls: collectedToolCalls };
}