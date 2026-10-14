# AGENTS.md — StudySpree

Instructions for any AI coding agent working in this repo.
Read this fully before writing code. When this file conflicts with a task prompt, **this file wins** unless the prompt explicitly says "override AGENTS.md".

---

## 1. What this project is

- **StudySpree** — a silent study-companion web app
- User picks an illustrated character who studies beside them in a looping video scene
- User runs a timer, banks hours, watches progress accumulate
- Tagline: *"Big goals start with showing up"*
- Built for people who struggle to **start** studying (ADHD, procrastination, camera-shy)
- **The product's job is initiation, not engagement.** Never add features that keep users in the app longer for its own sake.

---

## 2. Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15, App Router, TypeScript **strict** |
| Styling | Tailwind CSS + shadcn/ui |
| Client state | Zustand |
| Server state | TanStack Query |
| Dates | date-fns + date-fns-tz |
| Validation | zod |
| Animation | Framer Motion (UI), CSS transforms (scene) |
| Audio | Howler.js |
| Backend (Phase 6+) | Supabase (Postgres, Auth, RLS) |
| Hosting | Vercel |
| Tests | Vitest (unit), Playwright (e2e), pgTAP (database) |

Do **not** add a new dependency without saying why in your final report.
Prefer the standard library, then existing deps, then a new package.

---

## 3. Commands

```bash
npm run dev          # http://localhost:3000
npm run build
npm run lint
npm run typecheck    # tsc --noEmit
npm run test         # Vitest
npm run test:e2e     # Playwright
npm run db:start     # supabase start        (Phase 6+)
npm run db:reset     # supabase db reset     (Phase 6+)
npm run db:types     # regenerate src/types/database.ts
```

**Before reporting any task done, run:** `typecheck`, `lint`, `test`. All must pass.

---

## 4. Directory structure

```
src/
  app/
    (app)/               authenticated routes
      page.tsx             Start screen
      session/[id]/        running session + /complete
      stats/
      settings/
      dev/                 dev-only tools, 404 in production
    (auth)/              login, auth callback
    api/                 route handlers (Phase 7+)
  components/
    layout/ scene/ timer/ start/ stats/ settings/
    webcam/ ambience/ ui/        ui/ = shadcn, don't hand-edit
  lib/
    clock.ts             THE ONLY source of "now"
    repo/                Repository interface + implementations
    streaks/             pure streak logic
    stats/               date bucketing helpers
    characters/          registry
    audio/
    mock/                Phase 1 mock data only
  hooks/                 React hooks that wrap the repository
  stores/                Zustand stores
  types/                 domain.ts (hand-written), database.ts (generated)
public/
  characters/{slug}/     loop.mp4, loop.webm, poster.jpg
  audio/                 + LICENCES.md
supabase/migrations/     numbered SQL migrations
e2e/                     Playwright specs
docs/
scripts/
```

Put new files in the existing folder that fits. Do not create new top-level folders without asking.

---

## 5. NON-NEGOTIABLE RULES

Breaking any of these is a bug, even if tests pass.

### 5.1 Hours never decrease
- No code path may reduce a user's stored time
- No decay, no penalty, no reset of lifetime totals, no "streak lost → hours lost"
- `best_streak` is never reduced under any circumstance
- In the database: `day_stats.total_seconds` is protected by a trigger that raises on decrease

### 5.2 Duration comes from timestamps
- Elapsed time = `now() - startedAt`, computed fresh each tick
- **Never** increment a counter (`seconds++`) — it breaks on refresh and sleep
- **Never** send a duration from the client to the server
- Server API handlers must reject bodies containing `actualSeconds`, `duration` or `elapsed`
- `actual_seconds` is set by a database trigger, not by app code

### 5.3 The webcam never leaves the device
- `getUserMedia({ audio: false })` — audio is always false
- Stream goes to `<video>.srcObject` and **nowhere else**
- Forbidden near the stream: `fetch`, `XMLHttpRequest`, `WebSocket`, `RTCPeerConnection`, `MediaRecorder`, `canvas.toBlob`, `canvas.captureStream`
- `e2e/webcam-privacy.spec.ts` enforces this. Never weaken or delete it.
- Keep the file-header PRIVACY CONTRACT comment in `SelfView.tsx`

### 5.4 All time reads go through `now()`
- Import `now` from `@/lib/clock`
- **Never** call `Date.now()` or `new Date()` (no args) in app code
- Exception: `src/lib/clock.ts` itself
- This enables the dev time-machine for testing streaks and comeback flows

### 5.5 UI never touches storage directly
- Components never import `localStorage`, `supabase`, or `fetch` for app data
- Chain is: **Component → hook → `repo` → implementation**
- `repo` is a single export from `src/lib/repo/index.ts`
- Every method on `Repository` takes **no duration parameter**

### 5.6 Timezones
- A day is the day in the **user's profile timezone**
- Always use `toLocalDate(date, timezone)` from `src/lib/stats/localDate.ts`
- Never group by server timezone or implicit browser timezone
- Compare dates as `YYYY-MM-DD` strings with `differenceInCalendarDays`, never as timestamps

### 5.7 Copy that implies failure is banned
See section 7.

---

## 6. Architecture patterns

### Repository pattern
```
UI → hooks → Repository (interface)
                ├─ LocalRepository      localStorage   (Phases 2–5, and offline dev)
                └─ SupabaseRepository   API routes     (Phase 7+)
```
- Adding a data operation = extend the `Repository` interface **and every implementation**
- Both implementations must pass the shared contract tests in `src/lib/repo/contract.test.ts`
- Keep `LocalRepository` alive permanently; it powers fast UI tests

### Pure logic stays pure
- `src/lib/streaks/computeStreak.ts` has **no I/O, no clock, no React**
- Same for date bucketing and duration helpers
- Pure functions get exhaustive unit tests
- The SQL `update_streak()` function must mirror `computeStreak.ts` rule-for-rule; both are tested from a shared JSON fixture

### Server vs client
- Default to Server Components
- Add `'use client'` only for state, effects, browser APIs, or event handlers
- Admin/service-role Supabase client: `import 'server-only'`, **cron and account-deletion only**
- `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET` never reach the browser

### Data fetching
- TanStack Query keys come from `src/lib/queryKeys.ts` only — no inline key arrays
- On session end, invalidate: total, days, sessions, streak
- The hero total must **never** be served stale after a session ends

---

## 7. Copy and tone rules

The audience is anxious about starting. Words matter more than features.

**Banned in any user-facing string:**
```
fail, failed, failure, quit, give up, gave up, abandon(ed), only, just only,
short, incomplete, missed, lost streak, broken streak, behind, lazy,
finally, at last, again, "we missed you", "where have you been",
"you planned", "you only"
```

**Rules:**
- The end-session button is **"Finish"**. Never "Quit", "Stop", "End", "Give up"
- No confirm dialog when finishing a session
- Never compare actual vs planned duration, vs yesterday, vs other users
- Zero streak copy is **"Ready when you are"** — never "0 days"
- Zero days in the heatmap are **neutral grey** (`--grey-zero`). Never red, never an icon, never a border
- Comeback screen never mentions how many days were missed
- 5 minutes is a legitimate choice — label it "just open it"
- A freeze being used is **announced, never asked**: "We used a streak freeze. Your streak is safe."

A Playwright test greps the Complete screen for banned words. Don't work around it.

---

## 8. Code conventions

### TypeScript
- `strict: true`. No `any`. No `@ts-ignore` without a comment explaining why
- Validate every API request body and every `localStorage` read with **zod**
- Prefer `type` over `interface` except for `Repository`
- Exhaustive `switch` with a `never` check on unions

### React
- Function components, named exports (default exports only where Next requires)
- Hooks in `src/hooks/`, one hook per file, named `useThing`
- No `useEffect` for derived state — compute it
- Every interval/listener cleaned up on unmount
- Don't fetch in `useEffect`; use TanStack Query

### Performance — the scene must hold 60fps on an old laptop
- Animate **only** `transform` and `opacity`
- Prompt 2.4 explicitly authorizes `stroke-dashoffset` animation for `DepletingRing`; this exception applies to that component only.
- Never animate `width`, `height`, `top`, `left`, `margin`, `box-shadow`
- One `requestAnimationFrame` loop per animated component, never one per element
- Pause everything on `document.hidden`
- No layout shift: media containers have a defined aspect ratio

### Accessibility
- Respect `prefers-reduced-motion` everywhere (use `useReducedMotion`)
- Every interactive element is keyboard reachable with a visible focus ring
- Tap targets ≥ 44px
- Heatmap cells have `aria-label`
- Contrast ≥ WCAG AA

### Styling
- Tailwind utilities + the CSS variables in `globals.css`
- Colours via tokens (`--bg`, `--surface`, `--accent`, `--grey-zero`…) — **no raw hex in components**
- Tabular numerals (`tabular-nums`) on every number that changes
- Dark theme only for now
- One accent colour per character, from the registry

### Naming
- Files: `PascalCase.tsx` for components, `camelCase.ts` for everything else
- DB columns: `snake_case`. App types: `camelCase`. Map at the repository boundary
- Booleans: `isX`, `hasX`, `showX`

---

## 9. Testing requirements

| Change | Required test |
|---|---|
| Pure logic (streaks, dates, durations) | Vitest, exhaustive edge cases |
| Repository method | Add to the shared contract suite |
| New route handler | Vitest for validation + auth failure paths |
| DB trigger / RLS policy | pgTAP in `supabase/tests/` |
| User-facing flow | Playwright |
| New user-facing copy | Check against banned words (section 7) |

**The critical test:** `e2e/start-flow.spec.ts` — cold open → running session in **under 20 seconds**. If a change makes this fail, the change is wrong.

Never delete or skip a failing test to make a task pass. Fix the cause or ask.

---

## 10. Assets and licensing

- Character assets: `public/characters/{slug}/loop.mp4`, `loop.webm`, `poster.jpg`
- Assets are **immutable** (1-year cache). A new version ships under a **new filename** — never overwrite
- Budget: ≤ 8 MB per video. Use `scripts/prepare-character.sh`
- Audio: every file in `public/audio/` **must** be listed in `public/audio/LICENCES.md`
- **Never** add audio from YouTube, streaming services, or unlicensed sources
- **Never** add real-person likenesses or copyrighted characters (Marvel, DC, Disney, anime IP, etc.)
- Missing media files must fail **silently** to the gradient fallback — never crash, never show an error

---

## 11. Database rules (Phase 6+)

- All schema changes via numbered migrations in `supabase/migrations/`. Never edit an applied migration
- **RLS enabled on every user table**, no exceptions
- Users have no write policy on `day_stats` or `streaks` — triggers and RPCs write them
- All timestamps `timestamptz`
- `actual_seconds` computed by trigger, capped at 21600 (6h); abandoned sessions capped at 5400 (90 min)
- Run `npm run db:types` after every schema change and commit the result
- Never use the service-role client for ordinary user requests

---

## 12. Git workflow

- Branches: `main` (production) ← `dev` (staging) ← feature branches
- **Commit after each completed prompt/task**, small and focused
- Message format: `phase 2.3: wire start screen to repository`
- Never commit: `.env*` (except `.env.example`), keys, `node_modules`, generated media over 8 MB
- Never force-push `main` or `dev`

---

## 13. Scope discipline

**Do exactly what the task asks. Nothing more.**

- Don't add features, pages, settings, or dependencies that weren't requested
- Don't refactor unrelated code
- Don't "improve" copy — copy rules are deliberate
- If you spot something worth doing, **list it under "Suggestions" in your report**; don't do it

### Out of scope for V1 — do not build
Rooms · other users · chat · AI conversation · webcam-driven avatars · custom avatar builder · forum · leaderboards · payments · task lists · roadmap generator · push notifications · native apps · ads of any kind

### Ask before
- Adding any dependency over 50 KB
- Changing the `Repository` interface
- Changing a database migration that has already been applied
- Anything touching auth, RLS, or the webcam code
- Deleting a file you didn't create

---

## 14. Current status

> **Update this section at the end of every phase.**

- **Current phase:** 4.5 — Completion streak notices and comeback flow
- **Completed work:** scaffold, scenes, navigation, Home/Study, translated authentication, mock Stats dashboard, local repository and real timer, recent completion summaries with affirmations, early-stop coverage, cross-tab recovery, smooth depleting ring and live tab title, responsive character sheet in Study/Settings/session controls, optimistic character persistence, 400ms scene crossfades and keyboard navigation, ffmpeg asset preparation with immutable-file protection and an asset guide, pure streak activity engine with monthly freezes, shared JSON contract fixtures and DST/invariant coverage, session-derived day/summary totals, persisted streaks and idempotent freeze events, historical timezone buckets and repository conservation tests, repository-backed Stats with five-minute queries and paginated history, gap-filled calendar and bars, deterministic 40-hour development seed preserving existing history
- **Repository in use:** `authRepository` for authentication; `repo` exports the tested `LocalRepository` for the session flow
- **Known issues:** real character media has not been supplied; local profile defaults to UTC; live Supabase setup remains external
- **Next up:** next planned phase; supply licensed character media
- **Phase 4.4–4.5:** completion uses a short-lived Finish receipt with persisted event recovery after refresh, conditional streak/Day 1/freeze notices, and the local profile visibility setting; Study has a translated comeback screen with timezone-aware eligibility, banked hours, five-minute Start, daily persistence and debug events. The agreed Home/Study split is preserved.

---

## 15. Final report format

When you finish a task, end with exactly this:

```
DONE: <one-line summary>

FILES CREATED
- path

FILES CHANGED
- path — what changed

HOW TO TEST LOCALLY
1. step
2. step
3. expected result

CHECKS RUN
- typecheck: pass/fail
- lint: pass/fail
- test: pass/fail (n tests)

SUGGESTIONS (not done)
- ...

QUESTIONS / ASSUMPTIONS
- ...
```

If you could not complete something, say so plainly under QUESTIONS. Do not claim completion for work that doesn't run.
