import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About PolicyDesk — a portfolio project by Uriel Papa" },
      { name: "description", content: "The problem, approach, architecture and next steps behind PolicyDesk, a cited RAG assistant for HR policies." },
      { property: "og:title", content: "About PolicyDesk — a portfolio project by Uriel Papa" },
      { property: "og:description", content: "How PolicyDesk uses retrieval, citations, abstention and evaluations to answer HR questions reliably." },
    ],
  }),
  component: AboutPage,
});

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-2 border-t border-border py-8 sm:grid-cols-[120px_1fr]">
      <div className="font-mono text-xs uppercase tracking-widest text-primary">{n}</div>
      <div>
        <h2 className="font-display text-2xl font-semibold">{title}</h2>
        <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-muted-foreground">{children}</div>
      </div>
    </section>
  );
}

function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="font-mono text-xs uppercase tracking-widest text-primary">About this project</p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">PolicyDesk</h1>
      <p className="mt-3 text-muted-foreground">
        By <span className="font-medium text-foreground">Uriel Papa</span> ·{" "}
        <a className="text-primary underline-offset-2 hover:underline" href="https://github.com/Edamuza" target="_blank" rel="noreferrer">github.com/Edamuza</a> ·{" "}
        <a className="text-primary underline-offset-2 hover:underline" href="https://linkedin.com/in/uriel-papa-vitese01" target="_blank" rel="noreferrer">linkedin.com/in/uriel-papa-vitese01</a>
      </p>

      <div className="mt-8">
        <Section n="01" title="The problem">
          <p>HR and payroll teams answer the same questions every week — leave balances, paydays, overtime rules, 13th-month pay. Each answer takes minutes to look up, and a wrong one creates payroll disputes, compliance risk and lost trust.</p>
          <p>Generic chatbots make it worse: they answer confidently from general knowledge, not the company's own policy, and give no way to check where an answer came from.</p>
        </Section>
        <Section n="02" title="The approach">
          <p><strong className="text-foreground">Retrieval-augmented generation with citations and abstention.</strong> Policies are split into heading-aware passages (~400–800 characters) and embedded. A question is embedded too, and the top 4 passages by cosine similarity are retrieved.</p>
          <p>If no passage clears a relevance threshold, the app abstains without calling the model. Otherwise the model is instructed to answer only from the numbered passages, cite them as [n], and abstain if they don't contain the answer. Only passages the model actually cited are shown.</p>
          <p>An <strong className="text-foreground">evaluation harness</strong> runs a 15-question test set (including 3 out-of-scope questions) through the exact same pipeline. An AI grader checks key facts; citation accuracy and abstention are checked by deterministic rules. Scores are stored per run so changes to chunking, prompts or thresholds can be measured.</p>
        </Section>
        <Section n="03" title="Architecture">
          <pre className="overflow-x-auto rounded-lg border border-border bg-card p-4 font-mono text-xs text-foreground">{`Browser (React, TanStack Start)
   │  reads demo data (read-only, row-level security)
   ▼
Server functions ── Lovable AI Gateway
   │                 • google/gemini-embedding-2 (3072-d vectors)
   │                 • openai/gpt-6-astra (answers + grading)
   ▼
Lovable Cloud Postgres + pgvector`}</pre>
          <p><strong className="text-foreground">Tables:</strong> documents, chunks (with vector embedding), test_cases, eval_runs, eval_results. <strong className="text-foreground">Database function:</strong> match_chunks (cosine similarity search).</p>
          <p><strong className="text-foreground">Server functions:</strong> askQuestion, addDocument, deleteDocument, resetDemo, startEvalRun, runEvalItem, finishEvalRun. All model calls and writes happen server-side; the browser only has read access.</p>
        </Section>
        <Section n="04" title="What I'd do next in a real deployment">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>SSO login with role-based access, so documents can be scoped by country, team or employment type.</li>
            <li>Hybrid retrieval (vector + keyword) and a reranker, tuned against a larger, HR-authored test set.</li>
            <li>Document versioning with effective dates, so answers cite the policy in force on a given date.</li>
            <li>Connect PDF/Google Drive sources and the HRIS for personalised answers (e.g. "my" leave balance).</li>
            <li>Feedback buttons and a "hand off to HR" ticket flow; run evaluations in CI on every prompt change.</li>
          </ul>
        </Section>
      </div>
    </div>
  );
}
