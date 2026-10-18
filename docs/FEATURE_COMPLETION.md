# Current 17-feature acceptance checklist

18 October 2026. This replaces the old baseline's “remaining” descriptions as
the working checklist; it does not retroactively certify every feature.
Unchecked rows need the evidence listed before they can be called complete.
Source inspection confirms implementations in every category. Themes, fictional
characters and real people remain distinct. No fake remote integrations count.

| Done | Feature | Current evidence / remaining acceptance work |
| --- | --- | --- |
| [ ] | 17. Virtual characters | Original eight plus expanded cast, picker, snapshots and fallback exist. Seven current media browser cases pass. Continuous writing timing and staggered reader turns corrected; **smooth natural source motion remains unresolved**. |
| [ ] | 1. Dashboard | Visible-room server projection, honest offline directory, immediate Study links; real-account acceptance pending. |
| [ ] | 6. Stats/history | Saved-date range aggregation, keyset history and accessible chart/table; finish-to-stats real-account acceptance pending. |
| [ ] | 5. Profile | Four tabs, narrow DTO, constrained partner choices, owner uploads/follows; two-account privacy acceptance pending. |
| [ ] | 7. Achievements | All three kinds, shared definition registry and trusted idempotent SQL awards; current unit/database checks pass. Final profile integration pending. |
| [ ] | 4. Camera/tile | Local-only camera and separate opt-in publishing adapter; append-only statuses and history. All thirteen privacy cases passed on the isolated server. Final integration evidence pending. |
| [ ] | 15. Navigation/utilities | Capability routes, tasks, notifications, accessible search and feedback. Atomic task PATCH now preserves date/position; owner database checks pass. |
| [ ] | 2. Rooms | Presence leases, interval accounting, participant cursors, local pins, LiveKit adapter and mixed characters; two-account video acceptance pending. |
| [ ] | 3. Spaces | Categories, search, visibility, invitations and locked capacity checks exist. Owner PATCH preserves omitted fields; shared-account acceptance pending. |
| [ ] | 8. Focus partners | Merged overlap intervals, private human history, separate character history and consent-aware notifications; database/unit checks pass, room journey pending. |
| [ ] | 9. Buddy discovery | Owner editing, filters, stable cursors and real message action. Partial edits now preserve omitted fields. Shared-account acceptance pending. |
| [ ] | 10. Conversations | Membership RLS, realtime reconciliation, retry IDs, threads/read/saves and pagination; real-account thread acceptance pending. |
| [ ] | 11. Groups | Transactional ownership, membership, expiring/revocable invitations and private discovery; owner partial edits preserve description. Shared-account acceptance pending. |
| [ ] | 12. Feed | Real follows/visibility, idempotent posts/retries, attachments and reactions. New private reaction intervals preserve popular-feed snapshot scores after removal; database checks pass. |
| [ ] | 13. Scheduling | Timezone/DST validation, bookings/capacity, character/people modes and existing-timer Start. Partial edit support added; calendar account acceptance pending. |
| [ ] | 14. Leaderboards | Opt-in trusted snapshots, stable ties and both metrics. Requested 1–100 page size now honored; rank cursors bind metric/period and survive opt-out without offset shifts. Seven database assertions pass. Final API/UI evidence pending. |
| [ ] | 16. Entitlements | Server-protected feature allowances, interval unions, expiry, signature-checked billing boundary and idempotent event ledger exist. Database checks pass; real room journey pending. No payment collection activated. |

## Changes from this audit

- Migration 0055: owner-row-locked partial REST updates for tasks, groups,
  spaces/rooms, buddy listings and schedules; no omitted-field reset.
- Migration 0056: ranking page limits and rank-based cursors, filter binding,
  consent checks on every page. “Last seven days” means seven saved dates in
  each profile timezone, including today, **not** an elapsed 168-hour interval.
  Personal history is never regrouped by timezone changes.
- Migration 0057: private, trigger-owned reaction intervals retain the ranking
  score at a feed cursor's snapshot. Current reaction counts remain unique.

## Verification to date

- Typecheck and lint pass.
- 438 unit tests pass (80 files; two workers).
- 294 database assertions pass across 24 files, through migration 0057.
- Seven media browser cases pass after the final timing and cache changes.
- Camera privacy: all thirteen cases pass with the original network/track
  assertions intact. Initial failures were server navigation/compilation timeouts.
- Full real-account browser suite is being rerun; do not mark it passed yet.
- Buddhist, OM and Tibetan chant options were removed at the user's request.
  The three selected medieval tracks are exact local-only previews.
- External invitation email remains paused by the user. Natural source-motion
  replacement is unavailable with the current still-pose assets/tools.
