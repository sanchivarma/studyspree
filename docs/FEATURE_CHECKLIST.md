# StudySpree feature implementation checklist

Requested order: **17 → 1 → 6 → 5 → 7 → 4 → 15 → 2 → 3 → 8 → 9 → 10 → 11 → 12 → 13 → 14 → 16**.

Checkboxes mean implemented and verified, not merely scaffolded. Existing features are reused. Backend-dependent work must be verified against a running backend before its feature is marked complete.

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
- [x] **5. Profile** — private/public DTOs, editing, uploads, follow relationships and access controls verified.
  - [x] Private-by-default account cards, narrow public DTOs and owner editing.
  - [x] Profile/cover uploads to a private bucket; owner paths, size/MIME/signature validation and no-store authenticated delivery.
  - [x] Real follow/unfollow, unique relationships, counts and cross-user access rules.
  - [x] Five-language mobile UI, persisted development preview and two-account Supabase browser verification.
  - [x] Migration 0005 applied; generated types updated; 22 profile pgTAP assertions passed.
  - [x] Start and permanent webcam privacy regressions; profile transport isolated from the session import graph.
- [x] **7. Achievements** — pure eligibility, persisted idempotent awards and profile badges.
- [x] **4. Camera/personal tile** — mirror preference, tile visibility, status/history and explicit sharing boundary.
- [x] **15. Navigation/utilities** — feature-aware routes, tasks, notifications, search and feedback.
- [x] **2. Live session/room** — authorised room membership, presence, real media adapter and grid/pins.
- [x] **3. Spaces** — discovery, categories, invitations and atomic capacity enforcement.
- [x] **8. Focus partners** — merged participation overlaps, private history and favourites.
- [x] **9. Study-buddy discovery** — listings, search, owner editing, messaging and reporting/blocking.
- [x] **10. Conversations** — channels, private chats, threads, saved messages and reliable delivery.
- [x] **11. Groups** — discovery, private membership, moderation roles and ownership transfer.
- [x] **12. Feed/posting** — following/popular feeds, replies, reactions, saves and validated attachments.
- [x] **13. Scheduled focus sessions** — timezone-safe calendar, bookings, capacity and session entry.
- [x] **14. Leaderboards** — opt-in, trusted rankings, stable pagination and privacy.
- [x] **16. Entitlements/limits** — configured server-authoritative access and interval metering; no invented prices.

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

All 17 categories above are implemented. Earlier log entries describe intermediate checkpoints; the following supersedes their pending-dependency notes.

- Server-owned session start/Finish, refresh recovery, totals, streaks and achievements are live for real Supabase accounts. Local preview remains available separately.
- Three real-account integration journeys passed: community forms and persistence; two-account data/access controls and server sessions; two-account LiveKit camera opt-in/subscription plus male/female GIF partners and refresh.
- All 83 existing browser cases were verified across the full run and targeted reruns. No deadlines, webcam privacy assertions or forbidden-copy checks were weakened. The final inactivity keyboard-focus and ambience cleanup cases passed after fixing Finish navigation/focus and rebuilding the development cache.
- Database: 124 pgTAP assertions across seven files passed, including RLS, accounting invariants, capacity, partner overlap, limits, maintenance and dashboard privacy.
- Unit suite: 336 tests across 52 files passed. Typecheck, lint, production build and both asset licence/check commands passed.
- Final session regression: 12 Start/Finish/refresh/expiry/mobile/translation checks passed; the corrected idle keyboard-focus case then passed three consecutive runs. The idle hook exposes its synchronous visibility ref so input does not depend on a pending React render.
- Maintenance HTTP verification: unauthorized request rejected (401); configured bearer request succeeded with database and media cleanup available.
- Deployment configuration remains explicit: run the protected maintenance scheduler every minute; configure commercial plan policies before imposing limits. No paid plan, price or checkout was activated.
- Theme videos and audible ambience are still deliberate fallbacks/placeholders until licensed assets are supplied. Eight original looping GIF study partners are present.
