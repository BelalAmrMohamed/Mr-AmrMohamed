// public/ai/api.js — Gemini REST history + tool-call orchestration.
// Important: model Parts are persisted verbatim so Gemini thought signatures
// survive every multi-turn request and localStorage reload.

const ENDPOINT = '/api/chat';
const MAX_TOOL_ROUNDS = 4;

function textPart(text) {
  return { text };
}

function clonePart(part) {
  // JSON cloning keeps every field Gemini returned, including thoughtSignature
  // / thought_signature, without accidentally normalizing or dropping fields.
  return JSON.parse(JSON.stringify(part));
}

/** Converts stored chat messages into Gemini `contents`. */
export function historyToContents(messages) {
  const contents = [];

  for (const m of messages) {
    if (m.role === 'user') {
      contents.push({ role: 'user', parts: [textPart(m.text || '')] });
      continue;
    }

    // Interactive answers are internal UI events, but they must become a real
    // user turn so the model can grade the answer and continue a quiz.
    if (m.role === 'interaction') {
      contents.push({
        role: 'user',
        parts: [
          textPart(
            `[Interactive learning event]\n${JSON.stringify(
              m.interaction || { result: m.text || '' }
            )}`
          ),
        ],
      });
      continue;
    }

    if (m.role !== 'model') continue;

    // New messages contain exact Gemini model turns. Never rebuild these from
    // tool names/arguments: doing so loses thought signatures and step order.
    if (Array.isArray(m.geminiTurns) && m.geminiTurns.length) {
      for (const turn of m.geminiTurns) {
        if (Array.isArray(turn.modelParts) && turn.modelParts.length) {
          contents.push({
            role: 'model',
            parts: turn.modelParts.map(clonePart),
          });
        }
        if (Array.isArray(turn.functionResponseParts) && turn.functionResponseParts.length) {
          contents.push({
            role: 'user',
            parts: turn.functionResponseParts.map(clonePart),
          });
        }
      }
      continue;
    }

    // Legacy chats created before thought-signature persistence are still
    // readable/renderable in the UI, but their old synthetic tool calls cannot
    // be safely sent to Gemini because their original signatures are gone.
    // Preserve only their visible text instead of manufacturing a signature.
    if (m.text) {
      contents.push({ role: 'model', parts: [textPart(m.text)] });
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
 * Sends the full conversation and resolves functionCall -> functionResponse
 * until Gemini produces a final text response.
 *
 * `geminiTurns` is the exact model/function-response transcript generated
 * during this call. It is stored with the assistant message and replayed
 * verbatim on later turns, including all thought signatures.
 */
export async function sendMessage(contents, { onToolCall } = {}) {
  const working = contents.map((content) => ({
    ...content,
    parts: content.parts?.map(clonePart),
  }));
  const collectedToolCalls = [];
  const geminiTurns = [];
  let finalText = '';

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const data = await requestOnce(working);
    const parts = Array.isArray(data.content?.parts) ? data.content.parts : [];
    const calls = parts
      .filter((part) => part?.functionCall)
      .map((part) => ({
        ...part.functionCall,
        // Keep the complete original Part separately. This is the authoritative
        // object that must be replayed, including its thought signature.
        _part: clonePart(part),
      }));
    const text = parts
      .filter((part) => typeof part.text === 'string' && !part.thought)
      .map((part) => part.text)
      .join('');

    if (!calls.length) {
      geminiTurns.push({
        modelParts: parts.map(clonePart),
        functionResponseParts: null,
      });
      finalText = text;
      break;
    }

    for (const call of calls) {
      const publicCall = { ...call };
      delete publicCall._part;
      collectedToolCalls.push(publicCall);
      onToolCall?.(publicCall.name, publicCall.args, publicCall._part);
    }

    // Replay the exact model response Parts. Do not reconstruct functionCall
    // parts from name/args, because that strips thought signatures.
    const modelParts = parts.map(clonePart);

    // Gemini expects all parallel function calls first, then all responses.
    // Include the function-call ID when Gemini supplied one.
    const responseParts = calls.map((call) => {
      const functionResponse = {
        name: call.name,
        response: { status: 'rendered' },
      };
      if (call.id) functionResponse.id = call.id;
      return { functionResponse };
    });

    geminiTurns.push({
      modelParts,
      functionResponseParts: responseParts.map(clonePart),
    });

    working.push({
      role: 'model',
      parts: modelParts.map(clonePart),
    });
    working.push({
      role: 'user',
      parts: responseParts.map(clonePart),
    });

    if (round === MAX_TOOL_ROUNDS - 1) {
      finalText = text;
    }
  }

  return { text: finalText, toolCalls: collectedToolCalls, geminiTurns };
}
