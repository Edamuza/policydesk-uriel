import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { embed, generate } from "./ai.server";
import { ABSTAIN_TEXT, RELEVANCE_THRESHOLD, TOP_K, type AnswerResult, type Passage } from "@/lib/policy";

/** Embed any chunks that don't have a vector yet (seed rows ship without vectors). */
export async function ensureEmbeddings() {
  const { data, error } = await supabaseAdmin
    .from("chunks")
    .select("id, heading, content, documents(title)")
    .is("embedding", null)
    .limit(200);
  if (error) throw error;
  if (!data?.length) return;
  for (let i = 0; i < data.length; i += 32) {
    const batch = data.slice(i, i + 32);
    const vecs = await embed(
      batch.map((c) => `${(c.documents as { title?: string } | null)?.title ?? ""}\n${c.heading}\n${c.content}`),
    );
    await Promise.all(
      batch.map((c, j) =>
        supabaseAdmin.from("chunks").update({ embedding: JSON.stringify(vecs[j]) }).eq("id", c.id),
      ),
    );
  }
}

export async function retrieve(question: string): Promise<Passage[]> {
  await ensureEmbeddings();
  const [qv] = await embed([question]);
  const { data, error } = await supabaseAdmin.rpc("match_chunks", {
    query_embedding: JSON.stringify(qv),
    match_count: TOP_K,
  });
  if (error) throw error;
  return (data ?? []).map((r, i) => ({
    n: i + 1,
    chunk_id: r.id,
    document_id: r.document_id,
    title: r.title,
    heading: r.heading,
    content: r.content,
    score: Number(r.score),
  }));
}

const INSTRUCTIONS = `You are PolicyDesk, an HR and payroll policy assistant for employees.
Answer ONLY using the numbered passages provided. Do not use outside knowledge or assumptions.
Cite every factual claim with the passage number in square brackets, e.g. [1] or [2][3]. Only cite passages you actually used.
Be concise (1–4 sentences, plain language), but include the closely related specifics from the passage that an employee would need: amounts, rates, percentages, deadlines, eligibility conditions and required hours.
If the passages do not contain the answer, reply with exactly this sentence and nothing else:
${ABSTAIN_TEXT}`;

export async function answerQuestion(question: string): Promise<AnswerResult> {
  const retrieved = await retrieve(question);
  const relevant = retrieved.filter((p) => p.score >= RELEVANCE_THRESHOLD);
  if (!relevant.length) {
    return { answer: ABSTAIN_TEXT, abstained: true, citations: [], retrieved };
  }
  const context = relevant.map((p) => `[${p.n}] ${p.title} — ${p.heading}\n${p.content}`).join("\n\n");
  const raw = await generate({ instructions: INSTRUCTIONS, input: `Passages:\n${context}\n\nQuestion: ${question}` });
  const abstained = !raw || /couldn.?t find this in the company documents/i.test(raw);
  if (abstained) return { answer: ABSTAIN_TEXT, abstained: true, citations: [], retrieved };
  const used = new Set([...raw.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1])));
  const citations = relevant.filter((p) => used.has(p.n));
  return { answer: raw, abstained: false, citations, retrieved };
}

export async function gradeCorrectness(question: string, expected: string, answer: string) {
  const out = await generate({
    instructions:
      "You grade an HR assistant's answer. Pass if the answer correctly answers the question and is consistent with the expected key facts (wording may differ; extra correct detail is fine). The facts that directly answer the question must be present; a secondary supporting detail may be omitted. Fail if the direct answer is missing, wrong, or any fact is contradicted. Give a one-line reason.",
    input: `Question: ${question}\nExpected key facts: ${expected}\nAssistant answer: ${answer}`,
    schema: {
      name: "grade",
      schema: {
        type: "object",
        properties: { pass: { type: "boolean" }, reason: { type: "string" } },
        required: ["pass", "reason"],
        additionalProperties: false,
      },
    },
  });
  const j = JSON.parse(out) as { pass: boolean; reason: string };
  return { pass: !!j.pass, reason: String(j.reason ?? "") };
}
