Current acceptance evidence: see [FEATURE_COMPLETION.md](FEATURE_COMPLETION.md). This older baseline records prior findings; it does not supersede that ledger.

# StudySpree feature implementation checklist

Requested order: **17 → 1 → 6 → 5 → 7 → 4 → 15 → 2 → 3 → 8 → 9 → 10 → 11 → 12 → 13 → 14 → 16**.

The 17 October code-contract audit supersedes the completion claims below:
see [IMPLEMENTATION_AUDIT.md](IMPLEMENTATION_AUDIT.md). Checked top-level items
mean their core behavior exists, with structural deviations documented there;
unchecked items have substantive missing requirements. Nested checks and older
verification logs record the implemented subsets, not full prompt compliance.

For the current follow-up audit, original theme/audio completion and outstanding
machine/provider setup, see [REMAINING_WORK.md](REMAINING_WORK.md). Earlier
verification below records the working stack on 16 October. On 17 October the
user approved moving local Supabase to 55321–55324; the stack is running again
with preserved history. [Session companions and chat](SESSION_COMPANIONS.md)
records the current mixed-style/long-loop expansion and realistic-motion limitation.

- [x] **17. Virtual study characters** — local flow and database migration verified
  - [x] Eight distinct original animated GIFs: four adult male, four adult female; static posters and licence ledger.
  - [x] Typed registry, validation, asset preparation and asset checks.
  - [x] Accessible character picker; reduced-motion, visibility and missing-media handling.
  - [x] Persist local profile preferences and session snapshots independently from themes.
  - [x] Character-only sessions, refresh recovery and timer continuity browser tests.
  - [x] Migration 0004 applied, pgTAP passed, and database types generated from running local Supabase.
- [x] **1. Home/dashboard** — local and authorized server room discovery verified
  - [x] Solo/Virtual Partners shortcuts, preserved preferences and immediate personal Start.
  - [x] Typed repository query, latest-room/directory/online components and honest unavailable human mode.
  - [x] Five-language copy, unit coverage and two passing browser journeys.
  - [x] Authorized room discovery and room-scoped online presence connected to the server dashboard.
- [x] **6. Stats/history** — local and server repository reads verified
  - [x] All-time, 7/30/90-day and custom ranges; bounded charts with accessible tables.
  - [x] Cursor-based history with date/companion filters and per-session companion labels.
  - [x] Saved-date grouping, tied-timestamp pagination, invalid-range and DST tests.
  - [x] Browser checks for filters, all five languages, seed conservation, pagination, mobile heatmap, streak visibility and completion-to-Stats updates.
  - [x] Server repository supports filtered history, saved-date totals and cursor pagination.
- [ ] **5. Profile — partial:** editing/uploads/follows exist; profile tabs and constrained lookingFor values remain.
  - [x] Private-by-default account cards, narrow public DTOs and owner editing.
  - [x] Profile/cover uploads to a private bucket; owner paths, size/MIME/signature validation and no-store authenticated delivery.
  - [x] Real follow/unfollow, unique relationships, counts and cross-user access rules.
  - [x] Five-language mobile UI, persisted development preview and two-account Supabase browser verification.
  - [x] Migration 0005 applied; generated types updated; 22 profile pgTAP assertions passed.
  - [x] Start and permanent webcam privacy regressions; profile transport isolated from the session import graph.
- [ ] **7. Achievements — partial:** streak awards exist; study-time/session-count awards and highest profile badge remain.
- [ ] **4. Camera/personal tile — partial:** local privacy/mirror/status work; append-only status history and Spotify capability boundary remain.
- [ ] **15. Navigation/utilities — partial:** routes and utility pages exist; task editing/TodayTasks panel and capability registry remain.
- [ ] **2. Live session/room — partial:** real media/membership/grid work; participant cursor API, explicit adapter contract and local-only pin state differ.
- [ ] **3. Spaces — partial:** categories/private rooms/capacity work; unlisted mode, invite revocation and requested responsive sheet remain.
- [ ] **8. Focus partners — partial:** overlap/favorites work; character history and subject consent for arrival notifications remain.
- [ ] **9. Study-buddy discovery — partial:** basic listings work; category/timezone/availability and stable pagination remain.
- [ ] **10. Conversations — partial:** chats/replies/saves work; read state, optimistic message rows and realtime reconciliation remain.
- [ ] **11. Groups — partial:** membership/roles/transfer work; group invitations and owner-edit UI remain.
- [ ] **12. Feed/posting — partial:** feed/reactions/uploads work; publication retry idempotency and stable pagination remain.
- [ ] **13. Scheduled focus sessions — partial:** bookings/DST/capacity work; private-character schedules, saved scheduling timezone and editing remain.
- [ ] **14. Leaderboards — partial:** opt-in snapshot rankings work; best-streak/last-7-days query combination is not offered and API contracts differ.
- [ ] **16. Entitlements/limits — partial:** quota metering/enforcement work; per-feature contracts, usage-event ledger and billing/webhook boundary remain.

## Constraints and dependencies

- Themes remain environments. Characters are virtual companions. People are real users.
- Existing local-camera privacy tests remain mandatory.
- Supabase account/storage work already in progress must be preserved; local social previews cannot impersonate a real backend.
- Real video rooms will use **LiveKit Cloud**, selected by the user. Keep virtual GIF partners entirely local to the app; they must not consume LiveKit participant minutes. No paid plan activation is authorised. Cloud credentials are configured locally; two-account camera publishing/subscription checks passed. Commercial limits and payments require explicit product/provider configuration.
- No schema migration is marked verified until database tests and generated types can run.

## Verification log

- Feature 17: eight distinct GIFs validated (32 frames each, infinite loop, 106–141 KB); all 284 unit tests passed in the first implementation check.
- Character browser coverage: selection, independent themes, refresh, switching without resetting timestamps, zero camera requests, reduced motion, missing media, keyboard navigation, and tab visibility.
- Start/privacy regressions: 20 cases passed in the combined run; the four affected cases passed after correcting companion-control overlap with the self-view/permission note. The permanent 20-second camera request audit passed.
- Docker Desktop and local Supabase are running. Migrations 0001 through 0016 are applied and generated types match the local schema.
- Home: both browser journeys passed; local dashboard contract is covered by the 285-test unit suite. Real room discovery remains a dependency on feature 2, with no fabricated users/rooms in local mode.
- Stats: 292 unit tests passed; all nine relevant Stats browser cases passed across the initial and targeted verification runs. The completion regression passed unchanged once the resource-heavy initial container startup stopped. Existing deadlines and privacy assertions were retained.
- LiveKit Cloud selected for feature 2; pricing/self-hosting notes and server-only environment placeholders are recorded in docs/LIVEKIT.md. No subscription was activated.
- Local Supabase is healthy after excluding unused analytics/edge services. Database verification: 27 pgTAP assertions passed across auth, progress/RLS and companions; generated src/types/database.ts from the live local schema. Ended companion immutability and cross-user session isolation are verified.
- Local accounts: seven authentication UI browser tests passed, including wrong-password feedback and all five languages. A separate real-backend test passed for local magic-link delivery, session exchange, exactly three onboarding steps and authenticated refresh. Run `npm run test:e2e:supabase` with the local stack running; this does not replace the offline UI/privacy suites.
- Profile: local editing/refresh, all five languages and mobile layout passed; two real local accounts verified uploads, private/public/private visibility and follow/unfollow. Database suite: 49 assertions passed, including 22 new profile checks. Unit suite: 304 tests passed. Start/privacy regression run passed 17 cases initially; the four affected cases passed unchanged after removing the profile transport from the session import graph and allowing compilation to settle. Cold Start retained its 20-second deadline. No webcam privacy assertions were changed.

## Completed roadmap verification - 16 October 2026

This historical checkpoint reported all 17 categories as implemented. The
17 October contract audit above found missing requirements; this older log
records tests of the implemented subsets and is not proof of full compliance.

- Server-owned session start/Finish, refresh recovery, totals, streaks and achievements are live for real Supabase accounts. Local preview remains available separately.
- Three real-account integration journeys passed: community forms and persistence; two-account data/access controls and server sessions; two-account LiveKit camera opt-in/subscription plus male/female GIF partners and refresh.
- All 83 existing browser cases were verified across the full run and targeted reruns. No deadlines, webcam privacy assertions or forbidden-copy checks were weakened. The final inactivity keyboard-focus and ambience cleanup cases passed after fixing Finish navigation/focus and rebuilding the development cache.
- Database: 124 pgTAP assertions across seven files passed, including RLS, accounting invariants, capacity, partner overlap, limits, maintenance and dashboard privacy.
- Unit suite: 336 tests across 52 files passed. Typecheck, lint, production build and both asset licence/check commands passed.
- Final session regression: 12 Start/Finish/refresh/expiry/mobile/translation checks passed; the corrected idle keyboard-focus case then passed three consecutive runs. The idle hook exposes its synchronous visibility ref so input does not depend on a pending React render.
- Maintenance HTTP verification: unauthorized request rejected (401); configured bearer request succeeded with database and media cleanup available.
- Deployment configuration remains explicit: run the protected maintenance scheduler every minute; configure commercial plan policies before imposing limits. No paid plan, price or checkout was activated.
- Theme videos and audible ambience were placeholders at this checkpoint. The
  17 October audit adds four original illustrated video loops and five original
  synthesized audio files. Eight original looping GIF study partners remain present.
