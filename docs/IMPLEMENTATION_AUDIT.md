# Audit against the 17 code-level prompts

Audit date: 17 October 2026. Source baseline: commit `60b1f17`.

The previous statement that all 17 prompts were complete was too broad.
All categories have code, but several requirements are absent or implemented
with narrower semantics. Passing existing tests does not establish coverage
of every requirement in the supplied contract.

This is an inspection and verification report. No application features,
authentication policies, applied migrations, or provider settings were changed.

## Status definitions

- **Core complete:** the main behavior is implemented; structural deviations
  and verification limits are recorded below. This does not mean an exact match
  for every requested filename, DTO or HTTP endpoint.
- **Partial:** implemented behavior exists, but substantive requirements remain.

| # | Feature | Status | Remaining work / qualification |
|---|---|---|---|
| 1 | Home/dashboard | Core complete | Greeting, Study entry, companion shortcuts, authorized directory and real presence exist. Dashboard uses the repository operation endpoint, not `GET /api/dashboard`. The later People invitation shortcut replaces the original direct People-mode shortcut. |
| 2 | Live session/room | Partial | Real LiveKit media, leases, membership, mixed tiles, pin view and independent personal timer exist. Pins are persisted through the server rather than local view state. Roster is returned as one room-context payload, without the requested participant cursor API. The requested explicit `MediaRoomAdapter` interface is not present. |
| 3 | Spaces | Partial | Search/category discovery, creation, private access, invitations and atomic capacity checks exist. Visibility is a public/private boolean: no unlisted mode. No invite-revocation command or UI. The requested responsive Spaces sidebar/bottom sheet is a standalone generic board instead. Reads use offset cursors, not stable keyset pagination. |
| 4 | Camera/personal tile | Partial | Local preview, mirroring, visibility, status and history exist. History is an editable profile JSON array capped at 20, not append-only events with a paginated owner history API. No `shareNowPlaying` preference or Spotify capability/integration boundary. No dedicated session PersonalTileSheet. Live publishing does use a separate opt-in camera lifecycle. |
| 5 | Profile | Partial | Separate public/owner schemas, private images, safe URLs, editing and follow relationships exist. Summary/Achievements/Statistics/Focus Partners tabs are absent; current page combines a profile card, badges and editor. `lookingFor` is free-form tags rather than the required enum. Highest badge is not shown on the profile header/card. |
| 6 | Stats/history | Core complete | Lifetime/range totals, 7/30/90/custom filters, accessible chart table, cursor history, theme/mode labels and saved-date accounting exist. Requested small components are mostly inline in StatsScreen, and reads use `/api/repository`. |
| 7 | Achievements | Partial | Idempotent permanent streak milestones exist in UI, pure logic and SQL. Study-seconds and session-count achievements, generalized definitions/evaluator and highest profile badge are absent. Milestones are duplicated between TypeScript and SQL rather than generated from one registry. |
| 8 | Focus partners | Partial | Interval-union accounting, timezone days, human history and favorites exist. No separate character companion history method or UI. Human list uses offset pagination. Arrival notifications are already enabled, but the trigger checks recipient preference and blocks without explicit consent from the person whose arrival is disclosed. |
| 9 | Buddy discovery | Partial | Listings, subjects, owner save/unpublish, search, direct-message entry and blocks/reports exist. Student/professional/other category, timezone, availability, explicit open/closed DTO and category filter are absent. Owner editing is a generic upsert form without prefilling the existing listing. Pagination uses mutable updated_at order plus numeric offsets. |
| 10 | Conversations/channels | Partial | Channels, direct/group chats, replies, saved items, membership checks and retry-safe message IDs exist. Updates poll every three seconds rather than reconcile realtime events. No read-receipt/last-read operation. No optimistic pending/sent/error message rows or dedicated thread panel; replies render through generic cards/composers. Offset history can shift while new messages arrive. |
| 11 | Groups | Partial | Public/private groups, approval, roles, removal and transactional ownership transfer exist. Expiring/revocable group invitation records and acceptance flow are absent. `group.update` exists server-side but the group page has no owner-edit form. Requested dedicated group modules are generic community components. |
| 12 | Feed/posting | Partial | Real following/popular feeds, replies, reaction uniqueness, saves and validated private attachments exist. Post creation has no client request ID/unique retry key, so a retried publication can create a second post. Popularity is an inline reaction-count SQL expression, not the requested pure/configured ranking module. No per-post visibility field; visibility follows group scope. Reaction/save optimistic updates exist, but post creation does not render an optimistic pending post. Reads use offset pagination. |
| 13 | Scheduled sessions | Partial | 30/60-minute bookings, week view, DST disambiguation, capacity lock, cancellation and room entry exist. Schedules always create human rooms: no private-character booking mode or character snapshot. No persisted scheduling timezone field or owner schedule-edit operation/UI. Profile-timezone presentation is not equivalent to retaining the schedule's original timezone. The later monthly Calendar feature does not fill these gaps. |
| 14 | Leaderboards | Partial | Opt-in trusted scores, stable snapshot rank/UUID ordering, pagination and snapshot timestamp exist. Best-streak is all-time only; requested best-streak/last-7-days combination is not offered. Seven-day study time means seven local calendar dates per user's timezone, not a rolling 168-hour window. Routes and metric names differ from the supplied contract. |
| 15 | Navigation/utilities | Partial | Navigation, account controls, tasks, notifications, access-filtered search and feedback exist. Several requested panels/dialogs are standalone generic pages. Tasks support create/done/delete but not title/date/position editing; Home has no TodayTasks panel. No typed capability-based route registry. Session chrome remains minimal and People navigation was removed as subsequently requested. |
| 16 | Entitlements/usage | Partial | Configurable plan policies, expired-plan fallback, protected room quota checks and union-of-visits metering exist. No per-feature Entitlement DTO, explicit usage-event idempotency ledger, BillingAdapter, signed webhook processing contract/event ledger, or `/api/entitlements` endpoint. Missing commercial configuration correctly leaves quotas unrestricted; no fake checkout exists. |
| 17 | Eight looping characters | Core complete, expanded | Original eight distinct animated GIFs, four male/four female, posters, provenance, picker, snapshots, runtime fallbacks and validator exist. Later user requests expanded the registry to 23 (eight illustrated, three whimsical, twelve realistic); exact total-eight assertions now correctly target the original illustrated subset. Realistic GIFs are approximately five-second loops, not natural 2–3-minute videos. Illustrated/whimsical video loops are 150 seconds. |

## Cross-cutting contract deviations

1. **API and module shape:** most requested REST routes do not exist literally.
   Repository operations use `POST /api/repository`; community reads and commands
   use `POST /api/community`. Profile changes also reuse repository operations.
   `src/lib/community/schemas.ts` supplies a discriminated command union and
   generic item/context DTO instead of most per-feature contracts in `src/types/`
   and `src/lib/repo/*Types.ts`. These are working implementations, but are not
   an exact delivery of the specified API/file contracts.
2. **Social pagination:** community cursors are mostly numeric offsets. SQL
   ordering has tie breakers in many areas, but inserts/reordering between pages
   can still shift offsets. Stats history and leaderboard snapshots have their
   own stronger cursor semantics.
3. **Verification depth:** the database suite covers important permissions,
   durations, capacity, limits and overlap, but its passing count does not mean
   every requested concurrent, retry, revocation or realtime scenario is tested.
4. **Later instructions take priority:** retain the 23-character catalog, extra
   themes, 20-tile pages, compact bottom progress, right-side session chat and
   icon-only copy sharing. Do not reintroduce People-page links in the session
   or restore the superseded top timer ring to match the older prompt.

## Evidence anchors

- Dashboard/start: `src/components/start/HomeScreen.tsx`,
  `src/components/home/`, `src/lib/repo/serverStudy.ts`.
- General contracts/transport/UI: `src/lib/community/schemas.ts`,
  `src/lib/repo/community.ts`, `src/lib/community/server.ts`,
  `src/components/community/CommunityBoard.tsx`, `CommunityComposer.tsx`,
  `CommunityCard.tsx`.
- Rooms/media: `src/components/community/RoomScreen.tsx`,
  `src/hooks/useRoomSession.ts`, `src/hooks/useRoomMedia.ts`,
  `src/lib/community/roomMedia.ts` and migrations 0013/0015/0022.
- Tile history: `src/lib/personalTile/schemas.ts`,
  `src/lib/repo/serverStudy.ts` (`tile`/`updateTile`) and migration 0006.
- Profile: `src/lib/profiles/schemas.ts`,
  `src/components/profile/ProfileScreen.tsx`, `ProfileCard.tsx`.
- Stats: `src/components/stats/StatsScreen.tsx`, `StudyTimeChart.tsx`,
  `src/lib/stats/history.ts`, `src/lib/stats/ranges.ts`.
- Awards: `src/lib/achievements/eligibility.ts`, migration 0006.
- Social tables/commands/reads: migrations 0008–0012; later migrations were
  inspected for overrides before identifying missing operations.
- Partners: `src/lib/community/overlaps.ts`, migration 0010 (`partners`),
  migration 0012 (`notify_partner_arrival`).
- Scheduling: `src/lib/community/calendar.ts`, migration 0008
  (`scheduled_sessions`), migration 0009 (`event.*`).
- Metering: migration 0009 (`room_usage`), migrations 0013/0015,
  `src/components/community/CommunityBoard.tsx` (`plans`).
- Characters: `src/lib/characters/registry.ts`, `registry.test.ts`,
  `src/components/characters/`, `scripts/check-character-assets.mjs`,
  `public/characters/LICENCES.md`.

## Suggested repair order, not implemented by this audit

1. Add sender/subject consent for partner-arrival notifications; until then
   disable that notification feature rather than exposing private arrivals.
2. Make feed publication retry-safe and social history pagination stable.
3. Complete achievements, buddy fields, scheduling modes/timezone/editing and
   append-only tile status history.
4. Fill profile tabs/character history, group invitations/editing and missing
   task controls/panels.
5. Agree whether literal REST endpoints/per-feature contracts are required,
   then align modules and finish the billing/webhook boundary. No payment
   provider activation is implied.

## Fresh verification

- Typecheck: pass.
- Lint: pass.
- Vitest: 381 tests across 59 files, pass.
- pgTAP: 194 assertions across 13 files, pass against local Supabase.
- Character validator: pass, including eight distinct original infinite GIFs
  and all twelve realistic GIF animations.
- Browser smoke: three focused Home/solo/chat checks passed across the rerun
  and targeted retry. Initial attempt could not connect to port 3000; after
  starting `npm run dev:local`, the first Home-to-character navigation exceeded
  its five-second assertion while the development route was compiling. The
  unchanged test passed on targeted retry. This does not establish a clean
  cold-run result for the whole browser suite.
- No new LiveKit Cloud calls or external email deliveries were requested.
- Full browser suite, all two-account flows and every contract-specific test
  were not rerun for this audit. Production build was not rerun because only
  documentation changed.
