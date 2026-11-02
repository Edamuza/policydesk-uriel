ALTER TABLE public.documents ADD COLUMN is_public boolean NOT NULL DEFAULT true;
ALTER TABLE public.chunks ADD COLUMN is_public boolean NOT NULL DEFAULT true;
ALTER TABLE public.test_cases ADD COLUMN is_public boolean NOT NULL DEFAULT true;
ALTER TABLE public.eval_runs ADD COLUMN is_public boolean NOT NULL DEFAULT true;
ALTER TABLE public.eval_results ADD COLUMN is_public boolean NOT NULL DEFAULT true;
GRANT SELECT (is_public) ON public.chunks TO anon, authenticated;

DROP POLICY "Public read documents" ON public.documents;
DROP POLICY "Public read chunks" ON public.chunks;
DROP POLICY "Public read test cases" ON public.test_cases;
DROP POLICY "Public read eval runs" ON public.eval_runs;
DROP POLICY "Public read eval results" ON public.eval_results;

CREATE POLICY "Read published demo documents" ON public.documents FOR SELECT TO anon, authenticated USING (is_public);
CREATE POLICY "Read passages of published documents" ON public.chunks FOR SELECT TO anon, authenticated
  USING (is_public AND EXISTS (SELECT 1 FROM public.documents d WHERE d.id = document_id AND d.is_public));
CREATE POLICY "Read published test cases" ON public.test_cases FOR SELECT TO anon, authenticated USING (is_public);
CREATE POLICY "Read published eval runs" ON public.eval_runs FOR SELECT TO anon, authenticated USING (is_public);
CREATE POLICY "Read results of published runs" ON public.eval_results FOR SELECT TO anon, authenticated
  USING (is_public AND EXISTS (SELECT 1 FROM public.eval_runs r WHERE r.id = run_id AND r.is_public));