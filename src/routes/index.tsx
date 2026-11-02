import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowUp, FileText, Loader2, ShieldQuestion } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { askQuestion } from "@/lib/api.functions";
import type { Passage } from "@/lib/policy";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ask PolicyDesk — cited HR & payroll answers" },
      { name: "description", content: "Ask about leave, payroll, overtime and remote work. Every answer cites the exact policy passage." },
      { property: "og:title", content: "Ask PolicyDesk — cited HR & payroll answers" },
      { property: "og:description", content: "An AI policy assistant that answers only from company documents, with citations." },
    ],
  }),
  component: AskPage,
});

const STARTERS = [
  "How many sick leave days do I get?",
  "When is the 13th-month pay released?",
  "Do I need approval before working overtime?",
  "How many days a week can I work from home?",
];

type Msg =
  | { role: "user"; text: string }
  | { role: "assistant"; text: string; citations: Passage[]; abstained: boolean }
  | { role: "error"; text: string };

function AskPage() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), [msgs, busy]);

  const ask = async (q: string) => {
    const question = q.trim();
    if (!question || busy) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", text: question }]);
    setBusy(true);
    try {
      const r = await askQuestion({ data: { question } });
      if (!r.ok) {
        toast.error(r.error);
        setMsgs((m) => [...m, { role: "error", text: r.error }]);
      } else {
        setMsgs((m) => [...m, { role: "assistant", text: r.answer, citations: r.citations, abstained: r.abstained }]);
      }
    } catch {
      const text = "Network problem — the request didn't complete. Please try again.";
      toast.error(text);
      setMsgs((m) => [...m, { role: "error", text }]);
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void ask(input);
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col px-4 pb-6 pt-8">
      {msgs.length === 0 ? (
        <section className="py-6 text-center sm:py-12">
          <p className="font-mono text-xs uppercase tracking-widest text-primary">Bayanihan Digital Inc. · fictional</p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">Ask a policy question.</h1>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
            Answers come only from the company's own HR and payroll documents — every claim is cited, and if it isn't in the documents, PolicyDesk says so.
          </p>
          <div className="mt-8 grid gap-2 sm:grid-cols-2">
            {STARTERS.map((s) => (
              <button
                key={s}
                onClick={() => ask(s)}
                className="rounded-lg border border-border bg-card px-4 py-3 text-left text-sm shadow-paper transition hover:border-primary hover:text-primary"
              >
                {s}
              </button>
            ))}
          </div>
        </section>
      ) : (
        <section className="space-y-6 pb-4" aria-live="polite">
          {msgs.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">{m.text}</div>
              </div>
            ) : m.role === "error" ? (
              <div key={i} className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {m.text}
              </div>
            ) : (
              <AssistantMessage key={i} msg={m} />
            ),
          )}
          {busy && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Searching the policies and writing an answer…
            </div>
          )}
          <div ref={endRef} />
        </section>
      )}

      <form onSubmit={onSubmit} className="sticky bottom-4 mt-4 rounded-xl border border-border bg-card p-2 shadow-paper">
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void ask(input);
              }
            }}
            placeholder="e.g. How many vacation leave days do I get per year?"
            rows={1}
            maxLength={1000}
            className="min-h-11 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
            aria-label="Your question"
          />
          <Button type="submit" size="icon" disabled={busy || !input.trim()} aria-label="Send question">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
          </Button>
        </div>
      </form>
    </div>
  );
}

function AssistantMessage({ msg }: { msg: Extract<Msg, { role: "assistant" }> }) {
  const [active, setActive] = useState<number | null>(null);
  const byN = new Map(msg.citations.map((c) => [c.n, c]));
  const parts = msg.text.split(/(\[\d+\])/g);
  const sel = active != null ? byN.get(active) : undefined;
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md bg-ink font-display text-sm font-semibold text-primary-foreground">P</div>
      <div className="min-w-0 flex-1">
        {msg.abstained ? (
          <div className="flex items-start gap-2 rounded-lg border border-border bg-muted px-4 py-3 text-sm">
            <ShieldQuestion className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <span>{msg.text}</span>
          </div>
        ) : (
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
            {parts.map((p, i) => {
              const m = p.match(/^\[(\d+)\]$/);
              if (m && byN.has(Number(m[1]))) {
                const n = Number(m[1]);
                return (
                  <button
                    key={i}
                    onClick={() => setActive(active === n ? null : n)}
                    aria-label={`Show citation ${n}`}
                    className={`mx-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded px-1 align-text-top font-mono text-[11px] font-medium transition ${
                      active === n ? "bg-primary text-primary-foreground" : "bg-secondary text-primary hover:bg-primary hover:text-primary-foreground"
                    }`}
                  >
                    {n}
                  </button>
                );
              }
              return <span key={i}>{p}</span>;
            })}
          </p>
        )}
        {sel && (
          <div className="mt-3 rounded-lg border-l-4 border-primary bg-card p-4 shadow-paper">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileText className="h-3.5 w-3.5" />
              <span className="font-medium text-foreground">{sel.title}</span>
            </div>
            <div className="mt-1 font-display text-base font-semibold">§ {sel.heading}</div>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{sel.content}</p>
            <div className="mt-2 font-mono text-[11px] text-muted-foreground">relevance {sel.score.toFixed(3)}</div>
          </div>
        )}
        {!msg.abstained && msg.citations.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {msg.citations.map((c) => (
              <button
                key={c.n}
                onClick={() => setActive(active === c.n ? null : c.n)}
                className="rounded-full border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary"
              >
                [{c.n}] {c.heading}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
