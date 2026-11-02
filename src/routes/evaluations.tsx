import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Check, Loader2, Play, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { resultsQuery, runsQuery, testCasesQuery } from "@/lib/queries";
import { finishEvalRun, runEvalItem, startEvalRun } from "@/lib/api.functions";

export const Route = createFileRoute("/evaluations")({
  head: () => ({
    meta: [
      { title: "Evaluations — PolicyDesk accuracy dashboard" },
      { name: "description", content: "A 15-question test set graded for correctness, citation accuracy and abstention, with run history." },
      { property: "og:title", content: "Evaluations — PolicyDesk accuracy dashboard" },
      { property: "og:description", content: "Measured accuracy of PolicyDesk's answers, citations and abstentions over time." },
    ],
  }),
  component: EvaluationsPage,
});

function Pill({ ok, label }: { ok: boolean | null; label?: string }) {
  if (ok == null) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${ok ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive"}`}>
      {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
      {label ?? (ok ? "Pass" : "Fail")}
    </span>
  );
}

function EvaluationsPage() {
  const qc = useQueryClient();
  const tests = useQuery(testCasesQuery);
  const runs = useQuery(runsQuery);
  const [selectedRun, setSelectedRun] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [filter, setFilter] = useState<"all" | "failed">("all");

  const latest = runs.data?.find((r) => r.status !== "running") ?? null;
  const runId = selectedRun ?? latest?.id ?? null;
  const run = runs.data?.find((r) => r.id === runId) ?? null;
  const results = useQuery(resultsQuery(runId));

  useEffect(() => {
    if (progress) void qc.invalidateQueries({ queryKey: ["eval_results"] });
  }, [progress, qc]);

  const runEval = async () => {
    setFilter("all");
    let id: string | null = null;
    try {
      const s = await startEvalRun();
      if (!s.ok) throw new Error(s.error);
      id = s.runId;
      setSelectedRun(id);
      await qc.invalidateQueries({ queryKey: ["eval_runs"] });
      setProgress({ done: 0, total: s.cases.length });
      for (let i = 0; i < s.cases.length; i++) {
        let r = await runEvalItem({ data: { runId: id, caseId: s.cases[i]!.id } });
        if (!r.ok && (r.status === 429 || r.status === 504 || (r.status ?? 0) >= 500)) {
          await new Promise((res) => setTimeout(res, 4000));
          r = await runEvalItem({ data: { runId: id, caseId: s.cases[i]!.id } });
        }
        if (!r.ok) throw new Error(r.error);
        setProgress({ done: i + 1, total: s.cases.length });
      }
      const f = await finishEvalRun({ data: { runId: id } });
      if (!f.ok) throw new Error(f.error);
      toast.success("Evaluation complete.");
    } catch (e) {
      toast.error(`Evaluation stopped: ${(e as Error).message || "unknown error"}`);
      if (id) await finishEvalRun({ data: { runId: id, failed: true } }).catch(() => {});
    } finally {
      setProgress(null);
      await qc.invalidateQueries({ queryKey: ["eval_runs"] });
      await qc.invalidateQueries({ queryKey: ["eval_results"] });
    }
  };

  const rows = (results.data ?? []).filter((r) => (filter === "failed" ? !r.overall_pass : true));
  const kpis = [
    { label: "Overall pass rate", v: run?.overall_pct },
    { label: "Correctness", v: run?.correctness_pct },
    { label: "Citation accuracy", v: run?.citation_pct },
    { label: "Abstention accuracy", v: run?.abstention_pct },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Evaluations</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Every test question runs through the same answer pipeline as the Ask screen, then an AI grader checks the key facts while citations and abstention are checked by rule.
          </p>
        </div>
        <Button onClick={runEval} disabled={!!progress || !tests.data?.length}>
          {progress ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {progress ? `Running ${progress.done} / ${progress.total}` : "Run evaluation"}
        </Button>
      </div>

      {progress && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-paper">
          <div className="mb-2 flex justify-between text-sm">
            <span>Evaluating test questions…</span>
            <span className="font-mono">{progress.done} / {progress.total}</span>
          </div>
          <Progress value={(progress.done / progress.total) * 100} />
        </div>
      )}

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-xl font-semibold">Results</h2>
          {run && <span className="text-xs text-muted-foreground">Run of {format(new Date(run.created_at), "MMM d, yyyy · h:mm a")} · {run.status}</span>}
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-xl border border-border bg-card p-4 shadow-paper">
              <div className="text-xs text-muted-foreground">{k.label}</div>
              <div className="mt-1 font-display text-3xl font-semibold">{k.v != null ? `${Number(k.v)}%` : "—"}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card shadow-paper">
          <div className="flex items-center gap-2 border-b border-border p-3">
            {(["all", "failed"] as const).map((f) => (
              <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
                {f === "all" ? "All" : "Failed"}
              </Button>
            ))}
            <span className="ml-auto text-xs text-muted-foreground">{rows.length} shown</span>
          </div>
          {!runId ? (
            <div className="p-10 text-center text-sm text-muted-foreground">No evaluation runs yet. Click “Run evaluation” to grade all {tests.data?.length ?? 15} questions.</div>
          ) : results.isLoading ? (
            <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading results…</div>
          ) : results.isError ? (
            <div className="p-6 text-sm text-destructive">Couldn't load results.</div>
          ) : !rows.length ? (
            <div className="p-10 text-center text-sm text-muted-foreground">{filter === "failed" ? "No failed questions in this run." : "No results yet."}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead className="bg-muted text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="p-3 font-medium">Question & answer</th>
                    <th className="p-3 font-medium">Correctness</th>
                    <th className="p-3 font-medium">Citation</th>
                    <th className="p-3 font-medium">Abstention</th>
                    <th className="p-3 font-medium">Overall</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((r) => {
                    const cites = (r.citations as { title: string; heading: string }[]) ?? [];
                    return (
                      <tr key={r.id} className="align-top">
                        <td className="max-w-md p-3">
                          <div className="font-medium">{r.question}</div>
                          <div className="mt-1 text-xs text-muted-foreground">{r.answer}</div>
                          <div className="mt-1 text-xs italic text-muted-foreground">{r.correctness_reason}</div>
                          {cites.length > 0 && (
                            <div className="mt-1 font-mono text-[11px] text-primary">{cites.map((c) => `${c.title.replace("Bayanihan Digital Inc. — ", "")} › ${c.heading}`).join(" · ")}</div>
                          )}
                        </td>
                        <td className="p-3"><Pill ok={r.correctness_pass} /></td>
                        <td className="p-3"><Pill ok={r.citation_pass} /></td>
                        <td className="p-3"><Pill ok={r.abstention_pass} label={r.abstained ? "Abstained" : "Answered"} /></td>
                        <td className="p-3"><Pill ok={r.overall_pass} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-xl font-semibold">Run history</h2>
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-paper">
          {runs.isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading…</div>
          ) : !runs.data?.length ? (
            <div className="p-6 text-sm text-muted-foreground">No runs yet.</div>
          ) : (
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-muted text-left text-xs text-muted-foreground">
                <tr>
                  <th className="p-3 font-medium">Run</th>
                  <th className="p-3 font-medium">Items</th>
                  <th className="p-3 font-medium">Overall</th>
                  <th className="p-3 font-medium">Correctness</th>
                  <th className="p-3 font-medium">Citation</th>
                  <th className="p-3 font-medium">Abstention</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {runs.data.map((r) => (
                  <tr key={r.id} onClick={() => setSelectedRun(r.id)} className={`cursor-pointer hover:bg-muted ${r.id === runId ? "bg-secondary" : ""}`}>
                    <td className="p-3">{format(new Date(r.created_at), "MMM d · h:mm a")} <span className="text-xs text-muted-foreground">({r.status})</span></td>
                    <td className="p-3 font-mono">{r.completed} / {r.total}</td>
                    <td className="p-3 font-mono font-semibold">{r.overall_pct != null ? `${Number(r.overall_pct)}%` : "—"}</td>
                    <td className="p-3 font-mono">{r.correctness_pct != null ? `${Number(r.correctness_pct)}%` : "—"}</td>
                    <td className="p-3 font-mono">{r.citation_pct != null ? `${Number(r.citation_pct)}%` : "—"}</td>
                    <td className="p-3 font-mono">{r.abstention_pct != null ? `${Number(r.abstention_pct)}%` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-xl font-semibold">Test set <span className="text-sm font-normal text-muted-foreground">({tests.data?.length ?? 0} questions)</span></h2>
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-paper">
          {tests.isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading…</div>
          ) : tests.isError ? (
            <div className="p-6 text-sm text-destructive">Couldn't load the test set.</div>
          ) : (
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-muted text-left text-xs text-muted-foreground">
                <tr>
                  <th className="p-3 font-medium">#</th>
                  <th className="p-3 font-medium">Question</th>
                  <th className="p-3 font-medium">Expected key facts</th>
                  <th className="p-3 font-medium">Expected source</th>
                  <th className="p-3 font-medium">Should abstain</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tests.data?.map((t) => (
                  <tr key={t.id} className="align-top">
                    <td className="p-3 font-mono text-xs text-muted-foreground">{t.position}</td>
                    <td className="p-3 font-medium">{t.question}</td>
                    <td className="p-3 text-muted-foreground">{t.expected_facts}</td>
                    <td className="p-3 text-xs">{t.expected_source?.replace("Bayanihan Digital Inc. — ", "") ?? "—"}</td>
                    <td className="p-3">{t.should_abstain ? <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">Yes</span> : <span className="text-xs text-muted-foreground">No</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
