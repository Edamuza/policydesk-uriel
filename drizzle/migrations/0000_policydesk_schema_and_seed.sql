CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  is_seed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.documents TO anon, authenticated;
GRANT ALL ON public.documents TO service_role;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read documents" ON public.documents FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  chunk_index int NOT NULL,
  heading text NOT NULL,
  content text NOT NULL,
  embedding extensions.vector(3072),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX chunks_document_idx ON public.chunks(document_id);
GRANT SELECT (id, document_id, chunk_index, heading, content, created_at) ON public.chunks TO anon, authenticated;
GRANT ALL ON public.chunks TO service_role;
ALTER TABLE public.chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read chunks" ON public.chunks FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.test_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  position int NOT NULL,
  question text NOT NULL,
  expected_facts text NOT NULL,
  expected_source text,
  should_abstain boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.test_cases TO anon, authenticated;
GRANT ALL ON public.test_cases TO service_role;
ALTER TABLE public.test_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read test cases" ON public.test_cases FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.eval_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'running',
  total int NOT NULL DEFAULT 0,
  completed int NOT NULL DEFAULT 0,
  overall_pct numeric,
  correctness_pct numeric,
  citation_pct numeric,
  abstention_pct numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
GRANT SELECT ON public.eval_runs TO anon, authenticated;
GRANT ALL ON public.eval_runs TO service_role;
ALTER TABLE public.eval_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read eval runs" ON public.eval_runs FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.eval_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.eval_runs(id) ON DELETE CASCADE,
  test_case_id uuid,
  position int NOT NULL DEFAULT 0,
  question text NOT NULL,
  expected_facts text NOT NULL,
  expected_source text,
  should_abstain boolean NOT NULL DEFAULT false,
  answer text,
  citations jsonb NOT NULL DEFAULT '[]'::jsonb,
  abstained boolean NOT NULL DEFAULT false,
  correctness_pass boolean,
  correctness_reason text,
  citation_pass boolean,
  abstention_pass boolean,
  overall_pass boolean NOT NULL DEFAULT false,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX eval_results_run_idx ON public.eval_results(run_id);
GRANT SELECT ON public.eval_results TO anon, authenticated;
GRANT ALL ON public.eval_results TO service_role;
ALTER TABLE public.eval_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read eval results" ON public.eval_results FOR SELECT TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION public.match_chunks(query_embedding extensions.vector(3072), match_count int DEFAULT 4)
RETURNS TABLE (id uuid, document_id uuid, title text, heading text, content text, score float)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, extensions AS $fn$
  SELECT c.id, c.document_id, d.title, c.heading, c.content,
         1 - (c.embedding <=> query_embedding) AS score
  FROM public.chunks c JOIN public.documents d ON d.id = c.document_id
  WHERE c.embedding IS NOT NULL
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$fn$;
REVOKE EXECUTE ON FUNCTION public.match_chunks FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_chunks TO service_role;

INSERT INTO public.documents (id, title, content, is_seed) VALUES ('00000000-0000-0000-0000-000000000001', $q$Bayanihan Digital Inc. — Employee Handbook (fictional)$q$, $q$# Employee Handbook

## Working Hours
The standard workday at Bayanihan Digital Inc. is 8 hours of work per day, Monday to Friday, plus a 1-hour unpaid lunch break. Employees may choose a flexible start time anywhere between 7:00 AM and 10:00 AM, provided they complete their 8 working hours. For example, an employee who starts at 7:00 AM ends the day at 4:00 PM, while an employee who starts at 10:00 AM ends at 7:00 PM. Your chosen start time should be agreed with your manager and kept reasonably consistent.

## Remote Work
Employees may work remotely for up to 3 days per week with their manager's approval. Remote work arrangements are reviewed every quarter. While working remotely, employees must be online and reachable during the core hours of 10:00 AM to 4:00 PM. Employees are responsible for a safe, quiet workspace and a stable internet connection. Confidential documents must not be printed or viewed in public places.

## Overtime
Overtime must be pre-approved in the HR system before the work is performed. Requests should state the reason and the expected number of hours. Approved overtime on regular working days is paid at 125% of the employee's hourly rate. Overtime that was not pre-approved in the HR system will not be paid, except in documented emergencies confirmed by the department head.

## Attendance
Employees working at the office clock in through a geofenced clock-in in the company app, which only works within the office premises. Employees working remotely check in via the app at the start of their workday. Repeated late arrivals or missed check-ins are reviewed by the manager and may lead to coaching or disciplinary action.

## Code of Conduct
All employees are expected to act with honesty, respect and professionalism. Harassment, discrimination and bullying of any kind are not tolerated. Employees must avoid conflicts of interest and disclose any outside business that may compete with the company. Company information is confidential and may not be shared outside the company without authorization. Violations may be reported to HR or through the anonymous ethics hotline.

## Equipment
Each employee receives a company laptop and the accessories needed for their role. Equipment remains company property and must be used mainly for work. Lost or damaged equipment must be reported to IT within 24 hours. Upon separation from the company, all equipment, including the company laptop, must be returned within 5 working days.

_Fictional company. Sample policy for demonstration only; not legal advice._$q$, true);
INSERT INTO public.chunks (document_id, chunk_index, heading, content) VALUES ('00000000-0000-0000-0000-000000000001', 0, $q$Working Hours$q$, $q$The standard workday at Bayanihan Digital Inc. is 8 hours of work per day, Monday to Friday, plus a 1-hour unpaid lunch break. Employees may choose a flexible start time anywhere between 7:00 AM and 10:00 AM, provided they complete their 8 working hours. For example, an employee who starts at 7:00 AM ends the day at 4:00 PM, while an employee who starts at 10:00 AM ends at 7:00 PM. Your chosen start time should be agreed with your manager and kept reasonably consistent.$q$);
INSERT INTO public.chunks (document_id, chunk_index, heading, content) VALUES ('00000000-0000-0000-0000-000000000001', 1, $q$Remote Work$q$, $q$Employees may work remotely for up to 3 days per week with their manager's approval. Remote work arrangements are reviewed every quarter. While working remotely, employees must be online and reachable during the core hours of 10:00 AM to 4:00 PM. Employees are responsible for a safe, quiet workspace and a stable internet connection. Confidential documents must not be printed or viewed in public places.$q$);
INSERT INTO public.chunks (document_id, chunk_index, heading, content) VALUES ('00000000-0000-0000-0000-000000000001', 2, $q$Overtime$q$, $q$Overtime must be pre-approved in the HR system before the work is performed. Requests should state the reason and the expected number of hours. Approved overtime on regular working days is paid at 125% of the employee's hourly rate. Overtime that was not pre-approved in the HR system will not be paid, except in documented emergencies confirmed by the department head.$q$);
INSERT INTO public.chunks (document_id, chunk_index, heading, content) VALUES ('00000000-0000-0000-0000-000000000001', 3, $q$Attendance$q$, $q$Employees working at the office clock in through a geofenced clock-in in the company app, which only works within the office premises. Employees working remotely check in via the app at the start of their workday. Repeated late arrivals or missed check-ins are reviewed by the manager and may lead to coaching or disciplinary action.$q$);
INSERT INTO public.chunks (document_id, chunk_index, heading, content) VALUES ('00000000-0000-0000-0000-000000000001', 4, $q$Code of Conduct$q$, $q$All employees are expected to act with honesty, respect and professionalism. Harassment, discrimination and bullying of any kind are not tolerated. Employees must avoid conflicts of interest and disclose any outside business that may compete with the company. Company information is confidential and may not be shared outside the company without authorization. Violations may be reported to HR or through the anonymous ethics hotline.$q$);
INSERT INTO public.chunks (document_id, chunk_index, heading, content) VALUES ('00000000-0000-0000-0000-000000000001', 5, $q$Equipment$q$, $q$Each employee receives a company laptop and the accessories needed for their role. Equipment remains company property and must be used mainly for work. Lost or damaged equipment must be reported to IT within 24 hours. Upon separation from the company, all equipment, including the company laptop, must be returned within 5 working days.

_Fictional company. Sample policy for demonstration only; not legal advice._$q$);
INSERT INTO public.documents (id, title, content, is_seed) VALUES ('00000000-0000-0000-0000-000000000002', $q$Bayanihan Digital Inc. — Leave Policy (fictional)$q$, $q$# Leave Policy

## Vacation Leave
Regular employees receive 15 days of vacation leave per year. Vacation leave is accrued monthly at a rate of 1.25 days per month. Vacation leave requests must be filed in the HR system at least 5 working days before the first day of leave, and are subject to manager approval based on team workload.

## Sick Leave
Employees receive 10 days of sick leave per year. Sick leave should be reported to the manager as early as possible on the first day of absence. Sick leave longer than 2 consecutive days requires a medical certificate, submitted in the HR system upon return to work.

## Conversion of Unused Leave
At the end of the calendar year, unused vacation leave of up to 5 days is converted to cash at the employee's daily basic rate. Unused vacation leave beyond 5 days is forfeited. Unused sick leave is not convertible to cash.

## Bereavement Leave
Employees are entitled to 3 days of paid bereavement leave upon the death of an immediate family member (spouse, child, parent or sibling). Bereavement leave should be filed in the HR system as soon as practical.

## Birthday Leave
Every employee receives 1 day of paid birthday leave each year. It may be taken on the birthday itself or within the same month.

## Filing and Approval
All leave types are filed and tracked in the HR system. Leave balances are visible in the employee's profile. Managers should act on leave requests within 2 working days.

_Fictional company. Sample policy for demonstration only; not legal advice._$q$, true);
INSERT INTO public.chunks (document_id, chunk_index, heading, content) VALUES ('00000000-0000-0000-0000-000000000002', 0, $q$Vacation Leave$q$, $q$Regular employees receive 15 days of vacation leave per year. Vacation leave is accrued monthly at a rate of 1.25 days per month. Vacation leave requests must be filed in the HR system at least 5 working days before the first day of leave, and are subject to manager approval based on team workload.$q$);
INSERT INTO public.chunks (document_id, chunk_index, heading, content) VALUES ('00000000-0000-0000-0000-000000000002', 1, $q$Sick Leave$q$, $q$Employees receive 10 days of sick leave per year. Sick leave should be reported to the manager as early as possible on the first day of absence. Sick leave longer than 2 consecutive days requires a medical certificate, submitted in the HR system upon return to work.$q$);
INSERT INTO public.chunks (document_id, chunk_index, heading, content) VALUES ('00000000-0000-0000-0000-000000000002', 2, $q$Conversion of Unused Leave$q$, $q$At the end of the calendar year, unused vacation leave of up to 5 days is converted to cash at the employee's daily basic rate. Unused vacation leave beyond 5 days is forfeited. Unused sick leave is not convertible to cash.$q$);
INSERT INTO public.chunks (document_id, chunk_index, heading, content) VALUES ('00000000-0000-0000-0000-000000000002', 3, $q$Bereavement Leave$q$, $q$Employees are entitled to 3 days of paid bereavement leave upon the death of an immediate family member (spouse, child, parent or sibling). Bereavement leave should be filed in the HR system as soon as practical.$q$);
INSERT INTO public.chunks (document_id, chunk_index, heading, content) VALUES ('00000000-0000-0000-0000-000000000002', 4, $q$Birthday Leave$q$, $q$Every employee receives 1 day of paid birthday leave each year. It may be taken on the birthday itself or within the same month.$q$);
INSERT INTO public.chunks (document_id, chunk_index, heading, content) VALUES ('00000000-0000-0000-0000-000000000002', 5, $q$Filing and Approval$q$, $q$All leave types are filed and tracked in the HR system. Leave balances are visible in the employee's profile. Managers should act on leave requests within 2 working days.

_Fictional company. Sample policy for demonstration only; not legal advice._$q$);
INSERT INTO public.documents (id, title, content, is_seed) VALUES ('00000000-0000-0000-0000-000000000003', $q$Bayanihan Digital Inc. — Payroll & Benefits Guide (fictional)$q$, $q$# Payroll & Benefits Guide

## Payroll Schedule
Salaries are paid twice a month: every 15th and on the last day of the month. If a payday falls on a weekend, salary is released on the Friday before. Salaries are credited directly to the employee's payroll bank account.

## Payslips
Payslips are available in the company app on each payday. Payslips show gross pay, overtime, deductions and net pay.

## 13th-Month Pay
All rank-and-file employees receive 13th-month pay equal to one-twelfth (1/12) of the total basic salary earned within the calendar year. The 13th-month pay is paid on or before December 24 each year. Employees who separate during the year receive a pro-rated amount with their final pay.

## Statutory Deductions
Statutory deductions are taken from salary each payroll period: SSS, PhilHealth, Pag-IBIG and withholding tax. Contribution rates follow the current government tables and may change when the government updates them; this guide does not list specific rates.

## Salary Disputes
If an employee believes their salary or payslip is incorrect, they must file a salary dispute with HR within 30 days of the payday concerned. HR will respond with findings and, where needed, a correction in the next payroll.

## HMO Coverage
Health maintenance organization (HMO) coverage starts after 3 months of employment. Coverage includes the employee plus 1 dependent. Additional dependents may be enrolled at the employee's own cost.

_Fictional company. Sample policy for demonstration only; not legal advice._$q$, true);
INSERT INTO public.chunks (document_id, chunk_index, heading, content) VALUES ('00000000-0000-0000-0000-000000000003', 0, $q$Payroll Schedule$q$, $q$Salaries are paid twice a month: every 15th and on the last day of the month. If a payday falls on a weekend, salary is released on the Friday before. Salaries are credited directly to the employee's payroll bank account.$q$);
INSERT INTO public.chunks (document_id, chunk_index, heading, content) VALUES ('00000000-0000-0000-0000-000000000003', 1, $q$Payslips$q$, $q$Payslips are available in the company app on each payday. Payslips show gross pay, overtime, deductions and net pay.$q$);
INSERT INTO public.chunks (document_id, chunk_index, heading, content) VALUES ('00000000-0000-0000-0000-000000000003', 2, $q$13th-Month Pay$q$, $q$All rank-and-file employees receive 13th-month pay equal to one-twelfth (1/12) of the total basic salary earned within the calendar year. The 13th-month pay is paid on or before December 24 each year. Employees who separate during the year receive a pro-rated amount with their final pay.$q$);
INSERT INTO public.chunks (document_id, chunk_index, heading, content) VALUES ('00000000-0000-0000-0000-000000000003', 3, $q$Statutory Deductions$q$, $q$Statutory deductions are taken from salary each payroll period: SSS, PhilHealth, Pag-IBIG and withholding tax. Contribution rates follow the current government tables and may change when the government updates them; this guide does not list specific rates.$q$);
INSERT INTO public.chunks (document_id, chunk_index, heading, content) VALUES ('00000000-0000-0000-0000-000000000003', 4, $q$Salary Disputes$q$, $q$If an employee believes their salary or payslip is incorrect, they must file a salary dispute with HR within 30 days of the payday concerned. HR will respond with findings and, where needed, a correction in the next payroll.$q$);
INSERT INTO public.chunks (document_id, chunk_index, heading, content) VALUES ('00000000-0000-0000-0000-000000000003', 5, $q$HMO Coverage$q$, $q$Health maintenance organization (HMO) coverage starts after 3 months of employment. Coverage includes the employee plus 1 dependent. Additional dependents may be enrolled at the employee's own cost.

_Fictional company. Sample policy for demonstration only; not legal advice._$q$);
INSERT INTO public.test_cases (position, question, expected_facts, expected_source, should_abstain) VALUES (1, $q$How many vacation leave days do I get per year?$q$, $q$15 days per year, accrued 1.25 days per month$q$, $q$Bayanihan Digital Inc. — Leave Policy (fictional)$q$, false);
INSERT INTO public.test_cases (position, question, expected_facts, expected_source, should_abstain) VALUES (2, $q$How many sick leave days do I get?$q$, $q$10 days of sick leave per year$q$, $q$Bayanihan Digital Inc. — Leave Policy (fictional)$q$, false);
INSERT INTO public.test_cases (position, question, expected_facts, expected_source, should_abstain) VALUES (3, $q$When do I need a medical certificate for sick leave?$q$, $q$Sick leave longer than 2 consecutive days requires a medical certificate$q$, $q$Bayanihan Digital Inc. — Leave Policy (fictional)$q$, false);
INSERT INTO public.test_cases (position, question, expected_facts, expected_source, should_abstain) VALUES (4, $q$How far in advance must I file a vacation leave request?$q$, $q$At least 5 working days ahead$q$, $q$Bayanihan Digital Inc. — Leave Policy (fictional)$q$, false);
INSERT INTO public.test_cases (position, question, expected_facts, expected_source, should_abstain) VALUES (5, $q$What happens to my unused vacation leave at the end of the year?$q$, $q$Up to 5 unused days convert to cash at year end; the rest is forfeited$q$, $q$Bayanihan Digital Inc. — Leave Policy (fictional)$q$, false);
INSERT INTO public.test_cases (position, question, expected_facts, expected_source, should_abstain) VALUES (6, $q$Do I get leave for my birthday?$q$, $q$Yes, 1 day of birthday leave per year$q$, $q$Bayanihan Digital Inc. — Leave Policy (fictional)$q$, false);
INSERT INTO public.test_cases (position, question, expected_facts, expected_source, should_abstain) VALUES (7, $q$When is the 13th-month pay released?$q$, $q$On or before December 24; equal to one-twelfth of total basic salary earned in the year$q$, $q$Bayanihan Digital Inc. — Payroll & Benefits Guide (fictional)$q$, false);
INSERT INTO public.test_cases (position, question, expected_facts, expected_source, should_abstain) VALUES (8, $q$When is payday if the 15th falls on a Saturday?$q$, $q$Salary is released on the Friday before$q$, $q$Bayanihan Digital Inc. — Payroll & Benefits Guide (fictional)$q$, false);
INSERT INTO public.test_cases (position, question, expected_facts, expected_source, should_abstain) VALUES (9, $q$When does my HMO coverage start and who is covered?$q$, $q$After 3 months; covers the employee plus 1 dependent$q$, $q$Bayanihan Digital Inc. — Payroll & Benefits Guide (fictional)$q$, false);
INSERT INTO public.test_cases (position, question, expected_facts, expected_source, should_abstain) VALUES (10, $q$Do I need approval before working overtime?$q$, $q$Yes, overtime must be pre-approved in the HR system; paid at 125% of hourly rate on regular days$q$, $q$Bayanihan Digital Inc. — Employee Handbook (fictional)$q$, false);
INSERT INTO public.test_cases (position, question, expected_facts, expected_source, should_abstain) VALUES (11, $q$How many days a week can I work from home?$q$, $q$Up to 3 days per week with manager approval; core hours 10 AM–4 PM$q$, $q$Bayanihan Digital Inc. — Employee Handbook (fictional)$q$, false);
INSERT INTO public.test_cases (position, question, expected_facts, expected_source, should_abstain) VALUES (12, $q$How long do I have to return my laptop after leaving the company?$q$, $q$Within 5 working days of separation$q$, $q$Bayanihan Digital Inc. — Employee Handbook (fictional)$q$, false);
INSERT INTO public.test_cases (position, question, expected_facts, expected_source, should_abstain) VALUES (13, $q$What is the company's stock option plan?$q$, $q$Not covered — should abstain$q$, NULL, true);
INSERT INTO public.test_cases (position, question, expected_facts, expected_source, should_abstain) VALUES (14, $q$Can I bring my dog to the office?$q$, $q$Not covered — should abstain$q$, NULL, true);
INSERT INTO public.test_cases (position, question, expected_facts, expected_source, should_abstain) VALUES (15, $q$What is the CEO's salary?$q$, $q$Not covered — should abstain$q$, NULL, true);