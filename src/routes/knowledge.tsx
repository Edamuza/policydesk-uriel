import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type ChangeEvent } from "react";
import { format } from "date-fns";
import { Eye, FileUp, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { documentDetailQuery, documentsQuery } from "@/lib/queries";
import { addDocument, deleteDocument } from "@/lib/api.functions";

export const Route = createFileRoute("/knowledge")({
  head: () => ({
    meta: [
      { title: "Knowledge base — PolicyDesk" },
      { name: "description", content: "Policy documents PolicyDesk answers from, split into cited passages and indexed for vector search." },
      { property: "og:title", content: "Knowledge base — PolicyDesk" },
      { property: "og:description", content: "Add, view and delete the HR and payroll documents behind PolicyDesk's answers." },
    ],
  }),
  component: KnowledgePage,
});

function KnowledgePage() {
  const qc = useQueryClient();
  const docs = useQuery(documentsQuery);
  const [adding, setAdding] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<{ id: string; title: string } | null>(null);
  const [busyDelete, setBusyDelete] = useState(false);

  const doDelete = async () => {
    if (!deleting) return;
    setBusyDelete(true);
    try {
      const r = await deleteDocument({ data: { id: deleting.id } });
      if (!r.ok) throw new Error(r.error);
      toast.success(`Deleted “${deleting.title}”.`);
      await qc.invalidateQueries({ queryKey: ["documents"] });
    } catch (e) {
      toast.error((e as Error).message || "Could not delete document.");
    } finally {
      setBusyDelete(false);
      setDeleting(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Knowledge base</h1>
          <p className="mt-1 text-sm text-muted-foreground">Documents are split into passages by heading and paragraph, then indexed for semantic search.</p>
        </div>
        <Button onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4" /> Add document
        </Button>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card shadow-paper">
        {docs.isLoading ? (
          <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading documents…
          </div>
        ) : docs.isError ? (
          <div className="p-6 text-sm text-destructive">
            Couldn't load documents.{" "}
            <button className="underline" onClick={() => docs.refetch()}>Retry</button>
          </div>
        ) : !docs.data?.length ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No documents yet. Add one, or use “Reset demo data” to restore the samples.</div>
        ) : (
          <ul className="divide-y divide-border">
            {docs.data.map((d) => (
              <li key={d.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{d.title}</div>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                    <span className="font-mono">{d.chunk_count} passages</span>
                    <span>Added {format(new Date(d.created_at), "MMM d, yyyy")}</span>
                    {d.is_seed && <span className="text-primary">Sample</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setViewId(d.id)}>
                    <Eye className="h-4 w-4" /> View
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setDeleting({ id: d.id, title: d.title })} aria-label={`Delete ${d.title}`}>
                    <Trash2 className="h-4 w-4" /> Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AddDocumentDialog open={adding} onOpenChange={setAdding} />
      <ViewDocumentDialog id={viewId} onClose={() => setViewId(null)} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this document?</AlertDialogTitle>
            <AlertDialogDescription>“{deleting?.title}” and all its passages will be removed from the knowledge base.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete} disabled={busyDelete}>
              {busyDelete ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AddDocumentDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/\.(txt|md|markdown)$/i.test(f.name)) {
      toast.error("Please choose a .txt or .md file.");
      return;
    }
    if (f.size > 100_000) {
      toast.error("File is too large (max 100 KB).");
      return;
    }
    setContent(await f.text());
    if (!title) setTitle(f.name.replace(/\.(txt|md|markdown)$/i, ""));
  };

  const save = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error("Title and content are required.");
      return;
    }
    setBusy(true);
    try {
      const r = await addDocument({ data: { title, content } });
      if (!r.ok) throw new Error(r.error);
      toast.success(`Indexed “${title}” into ${r.chunks} passage${r.chunks === 1 ? "" : "s"}.`);
      await qc.invalidateQueries({ queryKey: ["documents"] });
      setTitle("");
      setContent("");
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message || "Could not add document.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add a document</DialogTitle>
          <DialogDescription>Paste text or upload a .txt/.md file. Use “## Heading” lines to mark sections.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="doc-title">Title</Label>
            <Input id="doc-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Travel policy (fictional)" maxLength={200} />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="doc-content">Content</Label>
              <label className="inline-flex cursor-pointer items-center gap-1 text-xs text-primary hover:underline">
                <FileUp className="h-3.5 w-3.5" /> Upload .txt / .md
                <input type="file" accept=".txt,.md,.markdown,text/plain,text/markdown" className="sr-only" onChange={onFile} />
              </label>
            </div>
            <Textarea
              id="doc-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={10}
              placeholder={"## Per Diem\nEmployees on out-of-town trips receive a per diem of PHP 1,500 per day."}
              className="font-mono text-xs"
            />
            <div className="text-right font-mono text-[11px] text-muted-foreground">{content.length.toLocaleString()} chars</div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
            <Button onClick={save} disabled={busy}>
              {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Indexing…</> : "Save & index"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ViewDocumentDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const q = useQuery({ ...documentDetailQuery(id ?? ""), enabled: !!id });
  return (
    <Dialog open={!!id} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{q.data?.title ?? "Document"}</DialogTitle>
          <DialogDescription>{q.data ? `${q.data.chunks.length} indexed passages` : "Loading…"}</DialogDescription>
        </DialogHeader>
        {q.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : q.isError ? (
          <div className="text-sm text-destructive">Couldn't load this document.</div>
        ) : (
          <ol className="space-y-3">
            {q.data?.chunks.map((c) => (
              <li key={c.id} className="rounded-lg border border-border bg-background p-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-muted-foreground">#{c.chunk_index + 1}</span>
                  <span className="font-display font-semibold">{c.heading}</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{c.content}</p>
              </li>
            ))}
          </ol>
        )}
      </DialogContent>
    </Dialog>
  );
}
