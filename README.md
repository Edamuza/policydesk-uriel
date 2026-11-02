# Policydesk Uriel

Build this complete app now, all screens and the backend, following the spec below. Use Lovable Cloud and Lovable AI; do not ask me for API keys.

# Project 1 — PolicyDesk: HR & payroll policy assistant with citations and an accuracy dashboard

Build "PolicyDesk", an AI assistant that answers employee questions about HR and payroll policies using only the company's own documents. Every answer cites the exact passage it used, and an evaluation dashboard proves how accurate it is.

## Screens
1. **Ask** (home): a chat-style Q&A. The user types a question; the app retrieves the most relevant passages from the knowledge base and the AI answers using only those passages. Answers show inline citation markers like [1], [2]; clicking a marker reveals the cited passage, its document title and section heading. If no passage is relevant enough, the assistant replies exactly in this spirit: "I couldn't find this in the company documents. Please ask HR." and shows no citations. Show 4 suggested starter questions.
2. **Knowledge base**: list documents (title, sections/chunks count, added date). Add a document by pasting text or uploading a .txt/.md file (title + content). On save, split into passages by heading/paragraph (~400–800 characters, keep the section heading with each chunk) and index them. Allow viewing and deleting a document.
3. **Evaluations**: a test set table (question, expected key facts, expected source document, "should abstain" flag). Seed 15 test questions: 12 answerable from the sample documents and 3 that are NOT covered (the correct behavior is to abstain). A "Run evaluation" button runs every test question through the exact same answer pipeline, then grades each result:
   - Correctness: an AI grader compares the answer to the expected key facts → pass/fail with a one-line reason.
   - Citation accuracy: pass if at least one citation comes from the expected source document.
   - Abstention: for "should abstain" items, pass only if the assistant abstained; for others, fail if it abstained.
   Show KPIs (overall pass rate %, correctness %, citation accuracy %, abstention accuracy %), a per-question results table with filters (all / failed), and a history of past runs with their scores so improvements are visible over time. Show progress while a run is in progress (e.g., "7 / 15").
4. **About this project** (see common requirements).

## Retrieval
- Prefer vector search (pgvector) with embeddings from Lovable AI if available. If embeddings are not available through Lovable AI, use Postgres full-text search (tsvector + ts_rank, English config) with a relevance threshold. Either way, return the top 4 passages with document title, section heading and score, and use a threshold so irrelevant questions abstain.
- The answer prompt must instruct the model to use only the provided passages, cite them by number, and abstain when they don't contain the answer.

## Seed documents (fictional; create these as realistic, detailed policy text with headings)
1. "Bayanihan Digital Inc. — Employee Handbook (fictional)": sections on working hours (8 hours/day, 1-hour unpaid lunch, flexible start 7–10 AM), remote work (up to 3 days/week with manager approval, core hours 10 AM–4 PM), overtime (must be pre-approved in the HR system; paid at 125% of the hourly rate on regular days), attendance (geofenced clock-in at the office; remote check-in via the app), code of conduct, equipment (company laptop, return within 5 working days of separation).
2. "Bayanihan Digital Inc. — Leave Policy (fictional)": vacation leave 15 days/year accrued monthly (1.25/month), sick leave 10 days/year, leave requests filed at least 5 working days ahead for vacation, sick leave over 2 consecutive days needs a medical certificate, unused vacation leave up to 5 days converts to cash at year end, bereavement leave 3 days, birthday leave 1 day.
3. "Bayanihan Digital Inc. — Payroll & Benefits Guide (fictional)": payroll every 15th and last day of the month (if a weekend, the Friday before), payslips available in the app, 13th-month pay equal to one-twelfth of total basic salary earned in the calendar year and paid on or before December 24, statutory deductions listed as SSS, PhilHealth, Pag-IBIG and withholding tax (no specific contribution rates — say rates follow current government tables), salary disputes filed with HR within 30 days, HMO coverage after 3 months for employees plus 1 dependent.
Add a footnote in each: "Fictional company. Sample policy for demonstration only; not legal advice."

## Seed test set examples (write all 15)
- "How many vacation leave days do I get per year?" → 15 days, accrued 1.25/month → Leave Policy.
- "When is the 13th-month pay released?" → on or before December 24, one-twelfth of basic salary earned → Payroll & Benefits Guide.
- "Do I need approval before working overtime?" → yes, pre-approved in the HR system; 125% on regular days → Employee Handbook.
- Unanswerable examples: "What is the company's stock option plan?", "Can I bring my dog to the office?", "What is the CEO's salary?" → should abstain.

## Acceptance checks (QA will test these in the published app)
- A1 Asking "How many sick leave days do I get?" returns 10 days with a citation to the Leave Policy; clicking the citation shows the passage.
- A2 Asking "Can I bring my dog to the office?" abstains with no citations.
- A3 Adding a new pasted document ("Travel policy (fictional)": per diem PHP 1,500/day for out-of-town trips) and then asking "What is the travel per diem?" answers PHP 1,500 with a citation to the new document.
- A4 Running the evaluation completes all 15 items with visible progress and shows KPIs and a per-question table; a new row appears in run history.
- A5 Deleting the added document removes it, and the per diem question then abstains.
- A6 Reset demo data restores the 3 documents and 15 test questions.
- A7 About page renders; no console errors; mobile layout works.

# Common requirements for all five portfolio apps (append to every Lovable spec)

These apps are portfolio pieces for Uriel Papa, who is applying for AI Solutions Engineer / Forward-Deployed Engineer roles. A hiring manager will open the published link and click around with no login and no setup. Everything must work on first visit.

## Stack and backend
- Use Lovable Cloud for the database, file storage and edge functions.
- Use Lovable AI (Lovable's built-in AI gateway) for every model call. Do not ask for, or depend on, any external API key (no OpenAI/Anthropic/OpenRouter keys).
- All model calls happen in edge functions, never in the browser.
- No login. This is a public demo. Keep Row Level Security enabled on every table, with policies that let the demo work (anonymous read of demo data; writes go through edge functions or narrowly scoped anon policies). The project must pass Lovable's security scan so it can be published.
- Handle AI errors visibly: show a friendly error toast/message on rate limits (429), credits (402) or timeouts, never a blank screen or a spinner that never ends.

## Demo data
- Seed realistic sample data on first load (or via a migration) so every screen has content immediately. All sample businesses, people and documents are fictional and labeled as such.
- Add a "Reset demo data" action (with confirm) that restores the seed state.
- Show a slim banner: "Demo app — all sample data is fictional."

## Portfolio framing
- Add an "About this project" page reachable from the nav with four short sections: The problem (who has it, what it costs), The approach (how the app solves it, the AI pattern used), Architecture (frontend → edge functions → Lovable AI → database; list tables and functions), What I'd do next in a real deployment. Author: Uriel Papa, with links to github.com/Edamuza and linkedin.com/in/uriel-papa-vitese01.
- Clean, professional, responsive UI (works at 375px phone width and on desktop). Consistent nav. Empty states, loading states and error states for every async action.

## Quality bar
- No console errors on load. No broken routes. Every button does something real.
- Numbers shown in tables/KPIs must be computed from stored data, not hard-coded.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://policydesk-uriel.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/3d6095b2-a704-4868-aa1b-7e0345b99083).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
