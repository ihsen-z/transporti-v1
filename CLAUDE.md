# ClaudeMemo — Source de vérité du projet

Claude lit ce fichier au démarrage et l'utilise comme source de vérité.

## 1. Always check docs with Context7 first

Before writing or editing any code that touches Next.js App Router,
Supabase (client, Auth, or RLS policies), or any other external library
used in this project, call Context7 to fetch the current official docs for
that library first.

Do this even if the pattern feels familiar — library APIs change, and this
project must never use deprecated patterns (e.g. old Supabase auth helpers,
outdated Next.js data-fetching patterns). If Context7 is unavailable for
some reason, say so explicitly before proceeding instead of silently
falling back to memory.

## 2. Graph-first reading — query before Read (token discipline)

Before reading ANY existing file, you MUST consult the Graphify graph
first. Reading a whole source file when the graph could answer is a
violation. The goal is token reduction: one graph query replaces several
full-file reads.

Order of operations for every "understand existing code" need:

1. Ensure the graph is fresh. If files changed since the last build, run
   `/graphify . --update` first. A stale graph is worse than none.
2. Locate via the graph, not Read:
   - Concept / "where is X" / "what connects X":
     `graphify query "<question>"`
   - Specific symbol: `graphify explain "<SymbolName>"`
   - How A reaches B: `graphify path "<A>" "<B>"`
   These return nodes with `source_location` (file:line).
3. Read ONLY the cited lines — use Read with offset/limit on the exact
   file:line the graph returned. Never a full-file Read, never a broad
   Grep, unless the graph returned nothing.
4. Fallback (allowed only after step 2 returns empty/irrelevant): say
   "graph miss: <query>" explicitly, then Grep/Read directly. Do not
   silently skip the graph.

Hard rules:
- No full-file Read of an existing file without a prior graph query in
  the same task. New files you are creating are exempt.
- Prefer `explain`/`path` (exact-symbol) over free-text `query`
  (free-text BFS misses on vocabulary mismatch).

If no graph exists yet for the project, run `/graphify .` once first, then
proceed.

## 3. TypeScript: zero tolerance for type errors

- No `any` unless absolutely unavoidable, and if used, add a comment
  explaining why.
- Every Supabase query result must be typed — generate or update types from
  the Supabase schema rather than hand-writing interfaces that can drift out
  of sync.
- Run a type check (`tsc --noEmit` or the project's existing type-check
  script) before considering any task finished. Fix all errors — do not
  leave known type errors "for later."
- Props, function parameters, and return types should be explicitly typed,
  not inferred as `any` or left implicit in ambiguous cases.

## 4. Clean code, small files — never one giant file

This project is professionnelle so structure matters as much as
functionality. Never put unrelated logic into one large file or one long
page component. Split by responsibility:

Guidelines:
- A page/route file should mostly **compose** smaller components or call
  functions from `lib/`, not contain the business logic itself.
- Each MCP tool gets its own file under `lib/mcp/tools/` — never one big
  file with all tool handlers inline.
- Database queries/mutations live in `lib/`, not scattered inside
  components or route handlers.
- If a file is approaching ~150–200 lines, that's a signal to split it
  further by responsibility.

## 6. MCP server authentication (applies to every tool in lib/mcp/tools/)

Every MCP tool call must pass through this exact sequence before any
business logic runs. This is non-negotiable and applies uniformly:

1. Extract the API key from the `Authorization: Bearer <key>` header.
2. Hash it (same method used when keys are stored) and look it up in
   `api_keys`. No match, or `is_active = false` → reject with 401
   immediately, before touching any tool logic.
3. On success, resolve `company_id` from that row. This is the *only*
   source of `company_id` for the rest of the request — never accept it
   as a tool parameter, never infer it from AI input.
4. Immediately after, check the company's `plan`. Not `'pro'` → reject
   with a clear, human-readable message (not a stack trace) explaining
   MCP access requires Pro.
5. Only after both checks pass does the requested tool run, scoped to
   that `company_id`.
6. Errors returned to the AI must never leak cross-company information —
   e.g. "ticket not found" for both "doesn't exist" and "belongs to
   another company."

When a prompt says "authenticate per project security standards," this
is the sequence being referenced — implement it in full even if a prompt
doesn't spell out every sub-step.

## 7. General code quality

- Add short comments explaining non-obvious logic — this codebase is used
  in a beginner-friendly tutorial, so clarity beats cleverness.
- Prefer explicit, readable code over compact one-liners.
- Keep environment variables (Supabase URL/keys, API secrets) out of
  client-side code unless they are the public anon key.
- After any change, briefly summarize what was touched and why, so it's
  easy to narrate on camera.
