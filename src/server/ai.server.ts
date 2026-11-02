// Server-only Lovable AI Gateway helpers (embeddings + streamed Responses calls).
const BASE = "https://ai.gateway.lovable.dev/v1";
export const CHAT_MODEL = "openai/gpt-6-astra";
export const EMBED_MODEL = "google/gemini-embedding-2";

export class AiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function key() {
  const k = process.env["LOVABLE_API_KEY"];
  if (!k) throw new AiError(500, "AI is not configured for this app.");
  return k;
}

async function failure(res: Response): Promise<AiError> {
  let msg = "";
  try {
    const j = (await res.json()) as { error?: { message?: string }; message?: string };
    msg = j?.error?.message ?? j?.message ?? "";
  } catch {
    /* ignore */
  }
  if (res.status === 429) return new AiError(429, "The AI is busy right now (rate limited). Please wait a moment and try again.");
  if (res.status === 402) return new AiError(402, msg || "AI credits are used up for this workspace. Please try again later.");
  if (res.status === 403) return new AiError(403, msg || "The AI request was denied.");
  return new AiError(res.status, msg || `AI request failed (${res.status}).`);
}

export async function embed(texts: string[]): Promise<number[][]> {
  const res = await fetch(`${BASE}/embeddings`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key()}`, "Content-Type": "application/json", "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({ model: EMBED_MODEL, input: texts }),
  });
  if (!res.ok) throw await failure(res);
  const j = (await res.json()) as { data: { index: number; embedding: number[] }[] };
  const out: number[][] = new Array(texts.length);
  for (const d of j.data) out[d.index] = d.embedding;
  return out;
}

/** Streams a Responses call and returns the accumulated output text. */
export async function generate(opts: {
  instructions: string;
  input: string;
  schema?: { name: string; schema: Record<string, unknown> };
}): Promise<string> {
  const body: Record<string, unknown> = {
    model: CHAT_MODEL,
    instructions: opts.instructions,
    input: opts.input,
    stream: true,
    store: false,
    reasoning: { effort: "low" },
  };
  if (opts.schema) body["text"] = { format: { type: "json_schema", name: opts.schema.name, schema: opts.schema.schema, strict: true } };
  const res = await fetch(`${BASE}/responses`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key()}`, "Content-Type": "application/json", "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) throw await failure(res);
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let text = "";
  let refusal = false;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n\n")) >= 0) {
      const frame = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      const dataLine = frame.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trim()).join("");
      if (!dataLine || dataLine === "[DONE]") continue;
      let ev: { type?: string; delta?: string; response?: { error?: { message?: string } }; message?: string };
      try {
        ev = JSON.parse(dataLine);
      } catch {
        continue;
      }
      if (ev.type === "response.output_text.delta" && ev.delta) text += ev.delta;
      else if (ev.type === "response.refusal.delta") refusal = true;
      else if (ev.type === "response.failed" || ev.type === "error")
        throw new AiError(500, ev.response?.error?.message ?? ev.message ?? "The AI request failed.");
    }
  }
  if (refusal && !text) throw new AiError(422, "The AI declined to answer this request.");
  return text.trim();
}
