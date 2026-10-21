# Performance audit — 21 October 2026

Status: implementation and verification in progress. Baseline: `f791abd`.

## Scope and method

The initial inventory includes 647 source files (1,224,247 bytes), 74 application
files, 70 hook files, 95 component files, 104 database/config/test files, 56 browser
test/support files, 41 scripts, and the documentation and asset catalogs. Counts
include existing tests and generated types; they are not counts of production
modules. The import audit parses TypeScript and follows runtime imports, excluding
type-only edges. Browser measurements use a real account against local Supabase.
No service-role authentication is used by the browser benchmark.

Development and production are measured separately. Development navigation can
include compilation, source maps and hot reload; those numbers must not be
presented as production performance. Warm navigation and local data are not a
substitute for profiling a large production dataset or an external media provider.

## Baseline evidence

First observed development visits: Settings 31,579 ms, Stats 27,345 ms,
Calendar 21,758 ms. Repeated visits across six destinations: 212–746 ms.
Those long first visits corresponded to compilation in the server logs.
The complete measured development journey downloaded 55,194,474 decoded script
bytes, including development-only code. The original production journey downloaded
1,454,180 decoded script bytes across the same destinations.

The production build initially reported:

| Route | First-load JS, gzip bytes | After |
| --- | ---: | ---: |
| Home | 395,762 | 268,270 |
| Study | 358,436 | 215,992 |
| Settings | 360,753 | 206,888 |
| Stats | 354,774 | 209,488 |
| Login | 228,852 | 164,566 |

These figures are computed from the route's emitted JavaScript files, gzipped
individually, matching the Next build report. They exclude media and server HTML.

Postgres statistics showed application community RPC averages around 40–54 ms
on the local dataset. The slow multi-second navigations were principally above
the database layer. Existing active-session, session-history, active-room-visit,
chat-history, and status-history indexes were checked. No speculative index or
applied-migration rewrite is justified by this evidence.

## Findings and changes

| Area | Finding | Change / decision |
| --- | --- | --- |
| Shared navigation, search, notifications | Closed drawers imported the generic community board and its forms into unrelated routes. | Load drawer bodies on demand; show translated pending feedback inside navigation links without delaying ready content behind a route fallback. |
| Translations | Universal imports loaded all five full dictionaries; pure duration helpers also imported that catalog. | Deliver the selected dictionary from the server, load language changes separately, and isolate the small unit-label catalog. Preserve placeholder and fallback checks. |
| Offline repository | Shared validation imported the complete local storage/history/achievement implementation; real accounts also eagerly loaded it. | Separate schemas and lazily initialize the preview repository. Tab-close dispatch stays synchronous. |
| Community forms | Shared button styles imported the complete composer. Generic cards imported unrelated editing forms. | Extract styles to a dependency-free module; defer unrelated forms and profile tabs. |
| Active sessions | Each consumer could own a polling interval and storage/event reconciliation. Active session pages also polled the saved copy of the same session. | One layout observer owns synchronization; avoid the duplicate session read. Ended records do not poll. |
| Community writes | Every mutation cancelled/refetched all community views and the dashboard. Room heartbeats did the same. | Refresh affected areas; retain broad refreshes for permission, membership, consent and block changes. Propagate query cancellation signals. |
| Joining rooms | Joining wrote identical companion preferences a second time and waited for another active-session request. | Reuse the authoritative Start response; update companions only when they differ. |
| Session rendering | The timer subscribed the entire personal session, including scenes/camera/grid, to second-by-second display updates. | Isolate ticking in the footer; preserve timestamp-based calculation and the existing completion guard. |
| Statistics | Each heatmap render repeatedly constructed hundreds of Intl formatters; hover and filter changes repeated label work. | Reuse formatters, memoize labels/derived chart data, and retain keyboard/accessibility behavior. |
| Server account reads | Layout and page repeated the same authenticated account read. Full preference JSON was selected for a small account guard. Profile operations verified the same identity repeatedly. | Request-scoped React memoization, explicit account columns and request-local profile client reuse; no cross-user cache. Session captions use the immutable username already supplied by the authenticated layout. |
| Onboarding and login | A successful navigation was immediately refreshed again. Onboarding repeated a completed server write through the preview repository. | Remove the redundant refresh/write and discard preview profile cache before entering the account layout. |
| Media services | Ordinary community reads imported the server media SDK. | Import media administration only for operations that require it. Keep awaited disconnect/permission enforcement. |
| More navigation | Opening the drawer speculatively requested all fourteen secondary destinations, competing with the clicked route. | Disable automatic prefetch for secondary links; keep primary navigation prefetch. |
| Compiler | Broad Radix barrel traversal, repeated server SDK bundling and memory pressure increased compilation cost. | Optimize package imports, use native Node entry points for the server SDKs, and enable supported Webpack memory optimizations. Measure the resulting build and cold navigation. |
| Search | Deferred rendering still sent a request for each typed character. | Debounce the query term while keeping the input immediate; verify settled terms and request counts in a real-account browser regression. |

## Areas reviewed without speculative rewrites

- Time accounting, streaks, achievements and historical local dates: preserve their
  existing pure logic, server ownership and database contracts.
- Auth, RLS, private profiles, signed media, invitations, billing and entitlements:
  preserve authorization and consent boundaries. Performance work must not cache
  user data globally or bypass access checks.
- Live room camera, local self-view and audio: keep their separate opt-ins, audio
  policy, visibility handling and permanent webcam privacy audit.
- Theme/character/Solo assets: retain immutable filenames, budgets, fallbacks,
  licensing, animation cadence and reduced-motion behavior. Asset-generation
  scripts are offline tools, not click-time work.
- Feed, groups, buddy discovery, conversations, contacts, scheduling, calendar,
  tasks, notifications and search: covered by shared import, cancellation and
  invalidation changes, followed by browser journeys and database contracts.
- API aliases, integrations, email delivery and maintenance: inspected as distinct
  server paths. External network latency must be reported separately from local
  navigation and database timing.
- Tooling, documentation, generated types and historical migrations: inventory
  and compatibility checks, rather than arbitrary rewrites of non-runtime files.

## Local serving and latency guard

The user-facing port 3000 originally remained in Turbopack development mode.
Its route compilation continued to cause multi-second clicks despite smaller
production bundles. That was an unresolved part of the initial fix. Port 3000
now serves the optimized production build. Use `npm run build` followed by
`npm run preview:local` to reproduce this setup, including maintenance. Normal
`npm run dev` still provides live editing and compiles routes on demand.
There is no evidence that every cold development compile meets two seconds.

On the actual local URL, first-click readiness was Study 302 ms, Settings 328 ms,
Stats 1,258 ms, Calendar 313 ms, Contacts 410 ms and return Home 178 ms.
The decoded initial scripts fell from 1,358,738 to 898,126 bytes (34%); the
measured navigation journey fell from 1,454,180 to 1,082,151 bytes (26%).
Warm production navigation was already fast before this change; the main
user-visible seven-second problem was serving development compilation.

Run `npm run test:performance` after building, with local Supabase and Mailpit.
Each click shares one fixed 2,000 ms deadline across actionability, navigation
and ready UI. Saved controls also await a successful real repository response.
The 1,000 ms target is annotated separately. No retries, threshold overrides,
route warm-up global setup, mocked database or service-role sign-in are used.
Each navigation test has a fresh browser context. Account provisioning and
loading the source screen are outside the action deadline. This measures an
already-open app's interactions, not email delivery, cold document startup,
Internet-provider availability or every device's CPU performance. CI retains
the JSON timing attachments, traces and screenshots in `click-performance`.
The shared-account CI also checks settled search request counts and one polling
owner. Existing twenty-second webcam privacy coverage remains unchanged.

A shared route loading fallback was tested and rejected: it delayed Home/Study
readiness to roughly 850-919 ms on warm visits. The final implementation uses
link-local pending feedback and retains immediate ready content.

## Verification ledger

- Baseline production build and asset checks: passed.
- Initial focused regression run: 69 tests passed.
- Full unit regression run: 482 tests passed across 91 files.
- Database contracts: 368 assertions passed across 29 files.
- Final typecheck, lint, full unit suite: pending.
- Production build and asset gates: passed; route JS reductions are recorded above.
- Actual production server on localhost:3000: 18 navigation clicks, 83-1,258 ms to ready content; repeat visits 83-228 ms. Initial document load was 2,380 ms and is reported separately from a navigation click. No browser errors.
- Browser functional, session lifecycle, shared-account and permanent webcam
  privacy checks: pending.
- Fixed production click budgets: 26 tests passed, no retries/skips. All 21 navigation destinations plus picker, saved selection, Search, Start/Finish, Settings save, and Public/Private controls are covered.

Official references: [lazy loading](https://nextjs.org/docs/app/guides/lazy-loading),
[package import optimization](https://nextjs.org/docs/pages/api-reference/config/next-config-js/optimizePackageImports),
[Webpack memory optimization](https://nextjs.org/docs/app/guides/memory-usage), and
[navigation status](https://nextjs.org/docs/15/app/api-reference/functions/use-link-status),
[server package boundaries](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages),
[request-scoped React cache](https://react.dev/reference/react/cache), and
[deferred rendering versus network requests](https://react.dev/reference/react/useDeferredValue).
