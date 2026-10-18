# AGENTS.md — StudySpree

Instructions for any AI coding agent working in this repo.
Read this fully before writing code. When this file conflicts with a task prompt, **this file wins** unless the prompt explicitly says "override AGENTS.md".

---

## 1. What this project is

- **StudySpree** — a silent study-companion web app
- User picks a background theme rendered as a looping scene
- Characters are virtual study partners; backgrounds remain themes. The new feature roadmap is in docs/FEATURE_CHECKLIST.md.
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
    themes/          registry
    audio/
    mock/                Phase 1 mock data only
  hooks/                 React hooks that wrap the repository
  stores/                Zustand stores
  types/                 domain.ts (hand-written), database.ts (generated)
public/
  themes/{slug}/     loop.mp4, loop.webm, poster.jpg
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
- The 20-second Settings opt-in regression and `.github/workflows/webcam-privacy.yml` must remain in CI. Never remove, skip, or disable them.

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
- Pause visual animation/video on `document.hidden`. Audio continues across tab/window visibility and focus changes, as explicitly requested by the user.
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
- One accent colour per theme, from the registry

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

- Theme assets: `public/themes/{slug}/loop.mp4`, `loop.webm`, `poster.jpg`
- Assets are **immutable** (1-year cache). A new version ships under a **new filename** — never overwrite
- Budget: ≤ 8 MB per video. Use `scripts/prepare-theme.sh`
- Audio: every file in `public/audio/` **must** be listed in `public/audio/LICENCES.md`
- **Never** add audio from YouTube, streaming services, or unlicensed sources
- **Never** add real-person likenesses or copyrighted themes (Marvel, DC, Disney, anime IP, etc.)
- User-authorized exception (18 October 2026): stylized historical Einstein and Tesla studying portrayals are permitted for this task; see docs/historical-companions/README.md.
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

### Original V1 scope and subsequent authorisation
The user subsequently authorised the 17-feature roadmap in docs/FEATURE_CHECKLIST.md, including rooms, human participants, conversations, groups, tasks, leaderboards, and entitlement infrastructure. Implement these in the recorded order. This supersedes the original exclusion of those features. AI conversation, webcam-driven avatars, a custom avatar builder, a roadmap generator, native apps, ads, and unconfigured payment collection remain outside this roadmap.

### Ask before
- Adding any dependency over 50 KB
- Changing the `Repository` interface
- Changing a database migration that has already been applied
- Anything touching auth, RLS, or the webcam code
- Deleting a file you didn't create

---

## 14. Current status

- **Wrist correction v30:** Einstein and Tesla retain a full-width native wrist connection anchored at the cuff throughout writing and pen return. Rejected detached-hand and synthetic bridge candidates are inactive. Backgrounds, line travel and loop duration remain unchanged. See docs/historical-companions/README.md.

- **Final scientist motion v24:** isolated original hand/pen rigs replace the rejected sweater/body movement and morphing writing frames. Both advance left-to-right across the page and lift on return. Built-in image_gen produced hidden clean plates only; prompts and selected plates are in docs/historical-companions. Einstein keeps the approved v20 background; Tesla uses short 200ms tower-anchored discharges by subsequent user instruction. A fixed source GIF palette prevents static-colour changes. Religious audio choices remain retired by migration 0059. No new dependency.

- **Latest user correction:** religious audio options Buddhist/OM/Tibetan are removed from the catalog, translations, local serving and saved selections (migration 0059). Medieval Warrior/Walk/Knight remain exact local preview downloads. Einstein/Tesla now use immutable v20: 13-second loops, localized writing-frame smoothing, 30fps video/20fps GIF, steady faces/cage and slow background movement. Source-pose realism remains limited; do not claim regenerated natural anatomy.

- **Latest media correction:** Arun v13 reverses native page-turn chronology without mirroring. Einstein/Tesla v14 stabilize the background and face while preserving original writing-region frames. OM now uses one voice and repeats on actual end, without overlap. User-selected ebunny medieval tracks and the unlicensed Archive.org OM excerpt are local previews in ignored .local/audio, served only in development on loopback with no-store. They are excluded from production bundles; do not mislabel CC BY-NC-ND as commercially free.
- **Audit integration fix:** Postgres offset timestamps in personal tile history are accepted and normalized to ISO UTC, fixing real-account status saves. Ranking reads honor page limits and bind keyset cursors; reaction history preserves popular-feed snapshot scores. Migrations 0055�0058 are applied locally; never edit them.

- **18 October activity-specific playback correction:** v12 removes the incorrectly applied reading holds from writing partners, gives realistic readers distinct ten-second reading gaps, and retimes Tesla to thirteen seconds. Source deformation is still unresolved; no optical-flow/still-sheet regeneration is authorized by this fix. Seventy-five inactive public assets and the rejected native review script were archived. See docs/page-turns/README.md and docs/MEDIA_CLEANUP.md.
- **User OM replacement:** the user overwrote effect-om-chant-v2.mp3. Its bytes now ship locally under a fresh v3 URL to bypass immutable caching; prior third-party attribution does not apply to this replacement. The user supplied the Archive.org OMChanting_201411 source; its metadata has no rights/license grant. Commercial audio packaging remains blocked until permission is established.

- **Active page-turn timing correction (18 October 2026):** v11 retimes the preceding GIF frames for all twelve realistic partners plus Idris/Elin/Einstein. Each has a distinct 15–20-second reading-pose hold, actions play 1.5x slower and full cycles differ (21.48–28.12s), replacing synchronized five-second repeats. No new poses, optical flow, crop or image mirroring is used; rejected v9/v10 candidates remain inactive. Original posters/files and Tesla's slow writing video are preserved. Script, immutable assets, licence rows, source hashes and frame-delay metadata are included. The timing fix does not claim to repair existing anatomical/source-motion defects. See docs/page-turns/README.md.

- **Motion review follow-up (18 October 2026):** user confirmed BOTH deformation and pausing/jumping, and rejected Arun's native-pose v10 review too. Do not propagate or promote that candidate. Existing v3 16-pose GIF holds (180/280/700 ms) contribute baked-in jerkiness; a higher output FPS cannot create coherent missing motion. The timer/idle-caption browser regression retains the same animation element. Stop still-sheet/optical-flow repair attempts. A Runway image-to-video plugin was found and suggested but is not connected; no generation or credit spending occurred. Genuine source-motion production and visual validation remain blocked on that capability or suitable source footage. See docs/page-turns/README.md. This follow-up changes documentation only; it does not claim a completed animation fix.

- **Companion motion recovery and statuses (18 October 2026):** the user rejected the new realistic v5/v9 optical-flow renders as glitchy. Active realistic paths have been restored to their preceding v1/v3/v4 GIFs; historical media is unchanged during recovery. This is a rollback, not a completed natural-motion repair. One native-pose Arun v10 review clip is isolated from the registry, pending visual feedback. Rejected experimental renders/scripts are archived outside public assets under ignored .tmp/animation-rejected. Source sheets/prompts and the limitations are recorded in docs/page-turns. File-integrity/frame-rate tests do not establish acceptable anatomy or motion quality. Separately, Matt naming, 50 general statuses plus themed pools, repository-owned per-session rotation, remembered personal status, idle captions and persistent navigation are implemented in five languages; migration 0053 is applied. Typecheck/lint and 425 unit tests pass, as do 272 database assertions, the 27-file integrity audit and focused session/status/companion browser checks. Full animation repair remains open; do not claim the entire cast is fixed.

- **Soothing sound and historical companions (18 October 2026):** retired the three medieval sound options and added a softened CC0 Gentle ocean recording. Legacy local and server preferences remove retired keys without resetting unrelated settings. Idris/Elin add original medieval studying GIFs; user-authorized stylized Einstein/Tesla portrayals add playful science scenes. All five languages and migrations 0051/0052 are included. Tesla was revised after user feedback to a fixed-background, slow 20-second writing cycle with lossless 30fps muted video and a 20fps GIF; active assets use immutable v5 names. Sources/prompts and processing are in docs/historical-companions. Typecheck/lint, 419 unit tests (35 affected tests rerun after final path changes), 267 database assertions, 29 audio licence entries, and four focused browser checks pass (ocean decoding/persistence, historical refresh/reduced-motion/Finish, and Tesla seam/stability). No dependencies added.

- **Two additional medieval choices (18 October 2026):** Medieval flute and Medieval lyre add distinct CC0 recordings with softened frequencies, slower tempo and independent persisted levels. The existing Medieval strings asset, key and label are unchanged; its SHA256 was verified. Five-language labels and migration 0050 extend validated preferences without rewriting saved data. Provenance/hashes are in docs/audio/expanded-ambience.md. Typecheck, lint, 417 unit tests, 266 database assertions, the 28-file licence ledger and two focused browser checks (distinct audible decoding and three-medieval refresh persistence) pass. No dependencies added.

- **Softer medieval ambience (18 October 2026):** the active `medieval` effect now uses a new immutable v2 asset: a CC0 slow-violin recording by Lukaszzz123 with softened high frequencies, gentle hall echo and a quieter -24 LUFS target. The option is called Medieval strings in all five languages. Saved selections/volumes keep the same key, and the original lute file is retained for cached clients. Sources and processing are recorded in docs/audio/expanded-ambience.md; no schema or dependency changes were needed. Typecheck, lint, 417 unit tests, two focused browser tests (decoding/headroom and saved levels) and the 26-file audio licence ledger pass.

- **Continuous audio and radio sizing (18 October 2026):** the user's latest requirement supersedes Phase 5's hidden-tab audio fading. Music, room ambience, background effects and radio now continue when the tab/window loses visibility or focus. The radio iframe remains mounted until station changes, Off or session exit. RadioPlayer proportionally scales the provider's right-hand controls to fill the panel, enlarging its volume bar and removing the left gap while preserving playback across resize. Visual scene/character visibility optimizations remain separate from audio. Typecheck, lint and 417 unit tests pass; four focused browser cases pass (the Finish journey passed unchanged on rerun after a dev-server timeout). The real embed was checked at desktop/mobile widths: its bar now occupies about 93/82px with a 7/6px left inset instead of the old blank area.

- **Expanded ambience (18 October 2026):** café v3 replaces the active quiet café with a normalized CC0 busy-coffee-shop excerpt. Medieval lute, Library ambience (three-minute reading-room excerpt) and Castle hearth (filtered/reverberant fireplace) add three independent saved effects. All six permitted free Lofi Cafe embeds are in the JSON catalog. Migration 0049 expands selection/volume validation without rewriting saved history or existing preferences. Sources, processing and hashes are in docs/audio/expanded-ambience.md; the new decode/loudness regression is included in CI. No dependency was added. All 415 unit tests, 262 database assertions, 25 audio licence entries and 15 focused browser checks pass, including a measured café RMS increase of at least 1.5×. The final 14-case control run passed after restarting the development server and splitting refresh/next-session coverage into separate tests without removing assertions.

- **Radio volume controls (18 October 2026):** removed the redundant Music Volume slider from session controls and Settings. Official Lofi Cafe embeds retain a 640px internal viewport with their right-hand controls visible inside the narrow panel; this prevents the provider's responsive layout from hiding volume on phones. Direct-stream catalog entries use a contextual Radio volume control. Provider volume was verified visible and keyboard adjustable without starting playback; no audio sources or dependencies changed.

- **Default-media CI regression (18 October 2026):** browser tests validate the original four 12-second scenes and expanded four 8-second scenes against their respective generator durations, sampling the actual end of each video for seam checks. Reused theme sound URLs are decoded once; distinct URLs still must have distinct fingerprints. Both media browser tests and the asset validator pass; published assets remain unchanged.

- **Background effects master volume:** slider changes now update both live sources during a loop crossfade; the retiring source fades out within 100ms instead of retaining its old level. Zero releases all effect sources. A crossfade unit regression and the browser live-gain/mute/restore check pass.

- **Sound-controls update (17 October 2026):** Music Volume and Background effects volume are separate. Cafe chatter, wind, real rainfall and thunderstorm use distinct verified CC0 recordings; brown and white noise remain original synthetic textures. Every effect has an independent persisted volume, multiplied by the master effects volume. Muting cancels playback/fades before releasing sources. Radio entries live in `src/lib/audio/radio-stations.json`; three Lofi Cafe official website embeds are configured with their published embedding permission. Embedded stations retain provider playback/volume controls; direct approved MP3 streams use the app slider. The legacy Music tracks section/options are removed from both session controls and Settings. Migrations 0043–0045 add validated owner-scoped preferences. No dependencies were added. Typecheck, lint, 396 unit tests, 248 database assertions and the 21-file licence ledger pass. See docs/AUDIO_RADIOS.md and docs/FIELD_RECORDINGS_LICENCE.md. This update does not mean all previously audited social contracts or provider journeys are complete.

> **Update this section at the end of every phase.**

- **Current phase:** all 17 authorized categories have code, but the fresh code-contract audit found substantive gaps. See docs/IMPLEMENTATION_AUDIT.md and the corrected docs/FEATURE_CHECKLIST.md; do not claim all 17 prompts are complete. This audit changes documentation, not application behavior.
- **Contract audit verification:** typecheck/lint, 381 unit tests, 194 local database assertions and the character validator pass. Three focused Home/solo/chat browser checks pass across reruns; the initial Home navigation timed out during cold compilation and passed unchanged on retry. Full two-account/provider journeys were not rerun. Outstanding implementation includes feed retry safety, notification-subject consent, append-only tile history, non-streak awards, scheduling modes/editing and billing contracts; see the audit before claiming readiness.
- **Calendar expansion:** monthly completed-reading/schedule view, accepted contacts and private lists, calendar invitations/RSVP, shareable room IDs and personal-session invitations, pinned self-video and narrow mixed room grids. All five languages are included. See docs/CALENDAR.md. Migrations 0017 through 0019 and generated types are applied locally.
- **Completed roadmap:** eight original GIF companions (four male/four female), dashboard, real Stats/history, profiles, achievements, personal tile, navigation/utilities, LiveKit rooms, spaces, focus partners, buddy discovery, conversations, groups, feed, scheduled sessions, opt-in leaderboards and server-enforced entitlement infrastructure. All five languages are included.
- **Repository in use:** real Supabase accounts use SupabaseRepository and authenticated API/RPC transport; development preview retains LocalRepository. Session timestamps, actual seconds, totals, streaks and awards are server-owned for real accounts. Saved historical local dates remain unchanged.
- **Verification:** production build, 381 unit tests and 194 database assertions passed, along with typecheck, lint and asset checks. Focused browser checks passed for chat drawer/focus/timer preservation, new theme selection/decoding, responsive tiles and camera placement/privacy. The full twenty-second camera network audit remains intact. The latest two-account browser journeys were blocked at local magic-link sign-in; earlier successful journeys are historical verification. Local Supabase now uses 55321–55324 with preserved history; migrations through 0027 are applied and generated types are current. Maintenance HTTP rejects unauthenticated access and succeeds with its configured bearer token.
- **Realistic GIF cast:** twelve fictional adult studying GIFs (six male/six female) across twelve translated background design briefs; total selectable cast is 23. Arun and Lin animate instead of using still previews. Lin revision v4 corrects a three-column source-sheet crop and interpolates to 109 frames at 20fps; seven original partners use 16 frames; the four expanded partners (Timur, Leilani, Valeria and Andre) use 106 frames at 20fps, 5.3 seconds, under 1.5 MB each. These approximately five-second loops are not natural multi-minute video. Built-in imagegen source sheets/prompts are in docs/realistic-gifs (sources.json and expanded-cast.json); no application dependency was added. Saved assets remain immutable. Ten companion/timer browser cases passed for the four-partner expansion, including actual browser-painted GIF changes, all-eight selection, refresh, reduced motion and fallback.
- **Session layout:** personal/shared screens use a measured responsive grid with twenty combined human/virtual tiles per page; the complete known character cast is selectable. A compact elapsed-time/countdown footer and horizontal progress bar replace the top timer ring. Add/visibility controls sit beside the stage. Character removal persists through the repository without touching timestamps; people can be hidden locally and restored from Room controls, separate from manager moderation. Pagination clamps on removal and unmounts off-page media. Camera lifecycle/privacy code is unchanged; its presentation accepts a class override to keep the floating self-view clear of the footer. Migration 0026 is applied; generated types are current.

- **Latest follow-ups:** inactive self-view is a side-rail camera control; active bottom-corner previews reserve 84px above the footer, or 128px when the participant pager is present. Nature Day, Nature Night, Sci-Fi Observatory and Deep Space add four original muted theme loops with posters and five-language copy. Theme schemas, account/session validation, history labels and ambience mappings include all eight themes. Chat is accessible from left-side session/room controls and opens a modal drawer on the right; preview/solo sessions have an honest shared-room entry state. Migration 0027 is applied. The automatic approval interruption was resolved through the normal review path. All 194 database assertions pass. Focused browser tests verify theme decoding/persistence, the left chat trigger/right drawer, Escape/focus restoration, and the permanent twenty-second camera network audit. Full two-account browser room verification remains blocked at local magic-link sign-in; do not report that journey as passing for this update.
- **Email invitations:** People and Contacts offer direct invitations for both real accounts and the development preview, with accurate account-mode copy. Existing-mailbox SMTP (including Gmail app passwords), optional Resend and explicit local Mailpit capture are implemented. Credentials stay server-only; real accounts have database-enforced hourly limits and RLS. Nodemailer handles SMTP/TLS. See docs/EMAIL_INVITATIONS.md. External inbox delivery requires the owner's mailbox credentials and a public HTTPS app URL; tests send to the local inbox only.
- **Session navigation correction:** removed People-page navigation from the running-session companion picker and chat drawer. Compact session/room sharing is a single copy-link icon with inline success/error feedback, without a popover or page-navigation button. Typecheck, lint, all 381 unit tests and the focused chat/companion-picker browser regression pass; direct invitation copying for real accounts has an updated integration assertion but was not reverified through the locally blocked magic-link flow.
- **Deployment requirements:** configure the protected maintenance scheduler every minute and commercial policies explicitly. No paid plan or checkout has been activated. LiveKit Cloud credentials are configured locally and verified; never print or commit them.
- **Original default media:** four original illustrated 1280×720 theme scenes now ship with versioned WebM/MP4 loops and JPEG posters; four synthesized room soundscapes and the original Still Water music track are audible. The previous silent preference and gradient fallbacks are preserved. All files have provenance/licence records, file checks and browser decoding/seam/audio-signal checks. No new dependency was added.
- **17 October sessions:** the user paused email setup and approved local ports 55321–55324; the backend is restored and no reset was run. Eight illustrated adults and three original whimsical partners have actual 150-second WebM/MP4 recordings plus short GIF previews. Twelve realistic fictional adults now have generated studying GIFs; natural continuous multi-minute photorealistic motion still needs eligible source video. A validated ffmpeg import helper and exact prompt/provenance records are in docs/SESSION_COMPANIONS.md. The picker mixes styles; participant grids paginate at twenty combined tiles. Session chat uses RLS-protected room messages, active participation, server-authored goal announcements once per visit, retry idempotence and server rate limits. Email setup remains paused. `npm run dev:local` starts the app and its maintenance worker together.
- **Profile (#5):** private-by-default profile cards, explicit signed-in visibility, owner editing, original-account username, HTTPS social links, interests/preferences, private profile/cover uploads and real follow/unfollow. Dedicated profile repository/server actions keep the account transport outside the session import graph. Migration 0005, generated database types and 22 new pgTAP assertions are verified. Local preview cannot publish or upload; two real accounts verified privacy changes and image revocation. Details: docs/PROFILES.md. No new dependency was added.
- **Phase 4.4–4.5:** completion uses a short-lived Finish receipt with persisted event recovery after refresh, conditional streak/Day 1/freeze notices, and the local profile visibility setting; Study has a translated comeback screen with timezone-aware eligibility, banked hours, five-minute Start, daily persistence and debug events. The agreed Home/Study split is preserved.
- **Phase 5.1:** session camera stub replaced with an off-by-default local mirrored preview, explicit opt-in, transform-based expansion, drag/keyboard corner selection persisted in the profile, translated permission guidance, missing-device handling, cleanup on disable/Finish/unmount and late permission resolution, cross-tab disable propagation and webcam privacy browser guards. The original privacy contract stays at the top of SelfView.
- **Phase 5.2:** the browser privacy suite includes 20 seconds of request inspection, constructor violation flags, external upload limits and WebRTC/STUN/TURN URL checks. GitHub Actions installs Chromium and enforces the suite on every push/pull request using generated development credentials and an automatically started local server.
- **Phase 5.3:** independent Howler music/room buses, gesture-only context initialization, two-instance/two-second loop crossfades, theme-matched room sound, visibility fades, translated speaker popover and 500ms debounced repository preferences; four original silent Opus/WebM assets with provenance, licence ledger/checker, and licence gates in builds and CI.
- **Phase 5.4:** Settings controls use serialized optimistic profile mutations with field-level rollback and no Save button; new profiles use the device timezone while saved choices and historical local dates remain unchanged by agreement. Settings self-view opt-in now requests permission immediately and releases the probe stream; the permanent privacy regression retains its twenty-second network assertions. Appearance, sound, volumes, track choice, display name and streak visibility persist and are translated into all five languages.
- **Theme naming:** scenes, registry, components, hooks, profile/session fields, audio matching, translations and asset paths use theme terminology. Legacy storage field names are normalized on read without writing over history; the next normal mutation persists the new names. Migration 0002 renames the profile column in place; the original applied migration stays unchanged.

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
