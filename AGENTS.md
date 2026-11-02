<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- All model calls and all writes go through `createServerFn` handlers in `src/lib/api.functions.ts`, which lazily import server-only modules (`src/server/*.server.ts`) — keeps the AI key and admin client out of the browser.
- The browser reads demo tables directly with the publishable client under anon SELECT-only RLS; never grant anon writes (public no-login demo).
- Ask and Evaluations share one pipeline (`answerQuestion`) so eval scores reflect real behaviour; change prompts/threshold there only.
- Seed rows ship without embeddings; `ensureEmbeddings` backfills missing vectors before retrieval, because migrations cannot call the embedding API.
- Seed content lives in `src/lib/seed-data.ts` and is used by both the seed migration and Reset demo data; keep them in sync.
- React effect callbacks always use a block body and never return a value: recent Chromium makes `Element.scrollIntoView()` resolve to a Promise, which React would then invoke as the effect's cleanup and crash the route. `src/test/ask-effect-cleanup.test.tsx` guards this.
