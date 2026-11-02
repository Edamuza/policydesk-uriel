import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const documentsQuery = queryOptions({
  queryKey: ["documents"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("documents")
      .select("id, title, is_seed, created_at, chunks(count)")
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((d) => ({ ...d, chunk_count: (d.chunks as unknown as { count: number }[])[0]?.count ?? 0 }));
  },
});

export const documentDetailQuery = (id: string) =>
  queryOptions({
    queryKey: ["document", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("id, title, content, created_at, chunks(id, chunk_index, heading, content)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return { ...data, chunks: [...(data.chunks ?? [])].sort((a, b) => a.chunk_index - b.chunk_index) };
    },
  });

export const testCasesQuery = queryOptions({
  queryKey: ["test_cases"],
  queryFn: async () => {
    const { data, error } = await supabase.from("test_cases").select("*").order("position");
    if (error) throw error;
    return data ?? [];
  },
});

export const runsQuery = queryOptions({
  queryKey: ["eval_runs"],
  queryFn: async () => {
    const { data, error } = await supabase.from("eval_runs").select("*").order("created_at", { ascending: false }).limit(50);
    if (error) throw error;
    return data ?? [];
  },
});

export const resultsQuery = (runId: string | null) =>
  queryOptions({
    queryKey: ["eval_results", runId],
    enabled: !!runId,
    queryFn: async () => {
      if (!runId) return [];
      const { data, error } = await supabase.from("eval_results").select("*").eq("run_id", runId).order("position");
      if (error) throw error;
      return data ?? [];
    },
  });
