import { createServerFn } from "@tanstack/react-start";
import type { AnswerResult } from "./policy";

type Fail = { ok: false; error: string; status?: number };
const fail = (e: unknown): Fail => {
  const err = e as { status?: number; message?: string };
  console.error(e);
  return { ok: false, error: err?.message || "Something went wrong.", status: err?.status };
};

const str = (v: unknown, max: number, name: string) => {
  if (typeof v !== "string" || !v.trim()) throw new Error(`${name} is required`);
  if (v.length > max) throw new Error(`${name} is too long`);
  return v.trim();
};

export const askQuestion = createServerFn({ method: "POST" })
  .inputValidator((d: { question: string }) => ({ question: str(d?.question, 1000, "Question") }))
  .handler(async ({ data }): Promise<({ ok: true } & AnswerResult) | Fail> => {
    try {
      const { answerQuestion } = await import("@/server/pipeline.server");
      return { ok: true, ...(await answerQuestion(data.question)) };
    } catch (e) {
      return fail(e);
    }
  });

export const addDocument = createServerFn({ method: "POST" })
  .inputValidator((d: { title: string; content: string }) => ({
    title: str(d?.title, 200, "Title"),
    content: str(d?.content, 100_000, "Content"),
  }))
  .handler(async ({ data }): Promise<{ ok: true; id: string; chunks: number } | Fail> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { chunkDocument } = await import("./chunker");
      const { embed } = await import("@/server/ai.server");
      const chunks = chunkDocument(data.content, data.title);
      if (!chunks.length) throw new Error("No text found in this document.");
      const vecs: number[][] = [];
      for (let i = 0; i < chunks.length; i += 32) {
        vecs.push(...(await embed(chunks.slice(i, i + 32).map((c) => `${data.title}\n${c.heading}\n${c.content}`))));
      }
      const { data: doc, error } = await supabaseAdmin
        .from("documents")
        .insert({ title: data.title, content: data.content })
        .select("id")
        .single();
      if (error) throw error;
      const { error: e2 } = await supabaseAdmin.from("chunks").insert(
        chunks.map((c, i) => ({
          document_id: doc.id,
          chunk_index: i,
          heading: c.heading,
          content: c.content,
          embedding: JSON.stringify(vecs[i]),
        })),
      );
      if (e2) {
        await supabaseAdmin.from("documents").delete().eq("id", doc.id);
        throw e2;
      }
      return { ok: true, id: doc.id, chunks: chunks.length };
    } catch (e) {
      return fail(e);
    }
  });

export const deleteDocument = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => ({ id: str(d?.id, 64, "id") }))
  .handler(async ({ data }): Promise<{ ok: true } | Fail> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error } = await supabaseAdmin.from("documents").delete().eq("id", data.id);
      if (error) throw error;
      return { ok: true };
    } catch (e) {
      return fail(e);
    }
  });

export const resetDemo = createServerFn({ method: "POST" }).handler(async (): Promise<{ ok: true } | Fail> => {
  try {
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { SEED_DOCUMENTS, SEED_TESTS } = await import("./seed-data");
    const { chunkDocument } = await import("./chunker");
    const none = "00000000-0000-0000-0000-000000000000";
    await db.from("eval_runs").delete().neq("id", none);
    await db.from("documents").delete().neq("id", none);
    await db.from("test_cases").delete().neq("id", none);
    for (let i = 0; i < SEED_DOCUMENTS.length; i++) {
      const d = SEED_DOCUMENTS[i];
      const id = `00000000-0000-0000-0000-00000000000${i + 1}`;
      const { error } = await db.from("documents").insert({ id, title: d.title, content: d.content, is_seed: true });
      if (error) throw error;
      const { error: e2 } = await db.from("chunks").insert(
        chunkDocument(d.content, d.title).map((c, j) => ({ document_id: id, chunk_index: j, heading: c.heading, content: c.content })),
      );
      if (e2) throw e2;
    }
    const { error: e3 } = await db.from("test_cases").insert(SEED_TESTS.map((t, i) => ({ ...t, position: i + 1 })));
    if (e3) throw e3;
    const { ensureEmbeddings } = await import("@/server/pipeline.server");
    await ensureEmbeddings().catch((e) => console.error("embedding backfill deferred", e));
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
});

export const startEvalRun = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ ok: true; runId: string; cases: { id: string }[] } | Fail> => {
    try {
      const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
      const { data: cases, error } = await db.from("test_cases").select("id").order("position");
      if (error) throw error;
      if (!cases?.length) throw new Error("The test set is empty.");
      const { data: run, error: e2 } = await db
        .from("eval_runs")
        .insert({ total: cases.length, status: "running" })
        .select("id")
        .single();
      if (e2) throw e2;
      return { ok: true, runId: run.id, cases };
    } catch (e) {
      return fail(e);
    }
  },
);

export const runEvalItem = createServerFn({ method: "POST" })
  .inputValidator((d: { runId: string; caseId: string }) => ({
    runId: str(d?.runId, 64, "runId"),
    caseId: str(d?.caseId, 64, "caseId"),
  }))
  .handler(async ({ data }): Promise<{ ok: true; overall_pass: boolean } | Fail> => {
    try {
      const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
      const { answerQuestion, gradeCorrectness } = await import("@/server/pipeline.server");
      const { gradeResult } = await import("./policy");
      const { data: run } = await db.from("eval_runs").select("id, status").eq("id", data.runId).single();
      if (!run || run.status !== "running") throw new Error("This evaluation run is not active.");
      const { data: tc, error } = await db.from("test_cases").select("*").eq("id", data.caseId).single();
      if (error || !tc) throw new Error("Test question not found.");
      const { data: existing } = await db
        .from("eval_results")
        .select("overall_pass")
        .eq("run_id", data.runId)
        .eq("test_case_id", tc.id)
        .maybeSingle();
      if (existing) return { ok: true, overall_pass: existing.overall_pass };

      const res = await answerQuestion(tc.question);
      let ai: { pass: boolean; reason: string } | null = null;
      if (!tc.should_abstain && !res.abstained) ai = await gradeCorrectness(tc.question, tc.expected_facts, res.answer);
      const titles = res.citations.map((c) => c.title);
      const g = gradeResult({
        should_abstain: tc.should_abstain,
        abstained: res.abstained,
        expected_source: tc.expected_source,
        citation_titles: titles,
        ai_correct: ai?.pass ?? null,
      });
      const reason = tc.should_abstain
        ? res.abstained
          ? "Correctly abstained — topic is not in the documents."
          : "Answered a question that should have been abstained."
        : res.abstained
          ? "Abstained, but the answer is in the documents."
          : (ai?.reason ?? "");
      await db.from("eval_results").insert({
        run_id: data.runId,
        test_case_id: tc.id,
        position: tc.position,
        question: tc.question,
        expected_facts: tc.expected_facts,
        expected_source: tc.expected_source,
        should_abstain: tc.should_abstain,
        answer: res.answer,
        citations: res.citations.map((c) => ({ n: c.n, title: c.title, heading: c.heading, content: c.content, score: c.score })),
        abstained: res.abstained,
        correctness_reason: reason,
        ...g,
      });
      const { count } = await db.from("eval_results").select("id", { count: "exact", head: true }).eq("run_id", data.runId);
      await db.from("eval_runs").update({ completed: count ?? 0 }).eq("id", data.runId);
      return { ok: true, overall_pass: g.overall_pass };
    } catch (e) {
      return fail(e);
    }
  });

export const finishEvalRun = createServerFn({ method: "POST" })
  .inputValidator((d: { runId: string; failed?: boolean }) => ({ runId: str(d?.runId, 64, "runId"), failed: !!d?.failed }))
  .handler(async ({ data }): Promise<{ ok: true } | Fail> => {
    try {
      const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
      const { pct } = await import("./policy");
      const { data: rows, error } = await db
        .from("eval_results")
        .select("overall_pass, correctness_pass, citation_pass, abstention_pass")
        .eq("run_id", data.runId);
      if (error) throw error;
      const r = rows ?? [];
      const n = r.length;
      await db
        .from("eval_runs")
        .update({
          status: data.failed ? "incomplete" : "completed",
          completed: n,
          overall_pct: pct(r.filter((x) => x.overall_pass).length, n),
          correctness_pct: pct(r.filter((x) => x.correctness_pass).length, n),
          citation_pct: pct(r.filter((x) => x.citation_pass).length, n),
          abstention_pct: pct(r.filter((x) => x.abstention_pass).length, n),
          finished_at: new Date().toISOString(),
        })
        .eq("id", data.runId);
      return { ok: true };
    } catch (e) {
      return fail(e);
    }
  });
