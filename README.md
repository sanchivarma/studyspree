# StudySpree

Big goals start with showing up.

## Run locally

Requires Node.js 22 and npm.

```powershell
npm.cmd install
npm.cmd run dev
```

Open http://localhost:3000. Only `src/app/(auth)/page.tsx` owns the root URL.

## Pages

- `/`: public welcome page, translated Login/Register tabs, Google/Facebook
  buttons, username/password login and password recovery.
- `/home`: signed-in Start page with the actual username greeting, tagline
  and a link to Study. No session controls or timer.
- `/study`: BookOpen navigation item and session setup.
- `/session/{id}`: persisted countdown or Open session, optional task, idle
  controls and Finish/Escape navigation. Refresh resumes from its timestamp.
- `/session/{id}/complete`: calm summary re-read from the local repository with
  a 1.2-second count-up that respects reduced motion and pauses in hidden tabs.
- `/stats`: deterministic 365-day mock dashboard with a keyboard-accessible
  CSS heatmap, conditional streak card, 14-day bars and 20 recent sessions.
- `/settings`: protected placeholder.
- `/reset-password`: password update after a valid recovery link.

English, German, French, Polish and Italian copy lives in separate JSON
files under `src/translations/{common,login,register,recovery,home,study,session,complete,stats}/`. The globe updates visible text, accessible
labels, document language and metadata. A cookie saves the preference.

## Connect real authentication

Follow [the Supabase setup guide](docs/supabase-setup.md). It covers project
creation, environment keys, the RLS profile migration, private username
lookup, email confirmation/recovery and Google/Facebook configuration.

Real accounts require Supabase configuration. Profile data and usernames come
from verified Supabase users.

For local previews, `.env.local` can define `DEV_ADMIN_USERNAME`,
`DEV_ADMIN_PASSWORD` and a random `DEV_ADMIN_SESSION_SECRET` of at least 32
characters. The configured test login works exclusively with `npm.cmd run dev`.
It uses a signed, HTTP-only cookie and grants no Supabase access or admin
privileges. Production ignores these credentials.

Dependencies added for authentication:
- `@supabase/supabase-js`: real Supabase Auth and profile access.
- `@supabase/ssr`: cookie-based sessions and token refresh.
- `server-only`: prevents authentication secrets from entering browser code.

## Checks

Browser tests use the running development server on port 3000. Install Chromium
once with `npx.cmd playwright install chromium`. `@playwright/test` was added
to verify the translated forms, responsive layout and development login flow.


```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test
npm.cmd run build
npm.cmd run test:e2e
```

Development output is `.next-dev`; production output is `.next`. Restart
the dev server after route-group or environment changes if it shows old routes.
Inter uses `next/font` and needs Google Fonts access during its initial compile.

Clock reads use `now()` in `src/lib/clock.ts`. Development offsets and
local scene gradients are available for future timer/progress work.

Stats fixtures use a seeded generator and a fixed reference date of
13 October 2026. They contain 365 consecutive dates, 91 zero days, a nine-day
gap and a recent ramp-up. Totals, streaks and session history derive from
the same daily fixture. These values do not write to Supabase.

## Local session repository (Phase 2.1)

`src/lib/repo/index.ts` exports the session `repo`. `LocalRepository` stores
validated JSON under `ss_profile`, `ss_sessions` and `ss_active`. Its profile
is separate from authentication and starts with a blank display name and UTC
timezone. Study falls back to the authenticated username when its local display
name is blank, and to Rainy Desk until the local character selection is loaded.

Start is idempotent while a session is active. Finish derives banked seconds
from `now()` timestamps, floors them and caps each session at six hours.
Web Locks serialize mutations across tabs where supported. Corrupt keys are
repaired, and denied storage or quota errors fall back to memory for that
repository instance (memory cannot survive a reload).

The repository contract tests cover this behavior. No new dependencies were
needed; Vitest and TanStack Query were already configured.

Phase 2.2 adds `useActiveSession`, `useStartSession`, `useEndSession` and
`useSessionTimer`. The timer publishes its first tick before paint, derives
each later tick from `now() - startedAt`, catches up immediately on visibility
changes and sends a heartbeat every minute while visible. Hidden tabs pause
their interval; elapsed time continues through timestamps. A completion guard
prevents repeated automatic Finish requests, including Strict Mode effect
restarts. The Zustand session store contains display values without persistence.

Start and Finish hooks invalidate query keys before navigating. Finish sends
the session ID and reason, and its URL contains no duration or totals.
Fake-timer tests exercise refresh, sleep, dev offsets,
automatic completion and cleanup without adding dependencies.

Phase 2.3 wires the full session flow. Study can start immediately while its
queries load, remembers the previous ended session's duration (including Open),
and logs `time_to_start_ms`. Home and Study resume an active session, including
when another tab creates one. Finish banks timestamp-derived seconds, and the
completion screen reads its session, lifetime hours and today's time from the
repository. Start another returns to Study. Stats remains the Phase 1 mock page.

To test: start five minutes on Study, refresh after ten seconds, then Finish.
The countdown resumes and the summary shows the seconds banked. A second tab
opened on `/` resumes the same session. For accelerated expiry, run
`localStorage.setItem('ss_dev_clock_offset_ms', '600000')` in the console and
reload. Clear the offset afterward with
`localStorage.removeItem('ss_dev_clock_offset_ms')`.

Phase 2.4 adds a depleting SVG ring with one animation-frame loop between
timer ticks. Open sessions use a slowly rotating quarter arc. The ring pauses
in hidden tabs; reduced motion uses minute updates and a stationary Open arc.
Timer digits switch to `h:mm:ss` at one hour. The document title shows the
live timer and restores its previous value when the session screen unmounts.
An invalid running-session ID returns through `/`; an ended session opens its
completion summary. Finish/Escape select the reason from the remaining time.

Phase 2.5 loads the latest saved session and shows completion when it ended
within ten minutes. Missing, active or expired summaries return through `/`.
The affirmation depends on actual seconds banked, and lifetime hours count up
from the previous total. Today uses hours and minutes; sessions under a minute
keep seconds visible. The streak row is a placeholder until Phase 4. Start
another returns through `/`; Study still remembers the previous duration.

## Character video scenes (Phase 3.1)

`SceneVideo` renders the CSS gradient immediately, then a loaded poster and
a muted, inline looping video. Video fades in over 600ms when playback data is
ready, pauses when the tab is hidden, and catches autoplay rejection silently.
OS reduced motion or the local profile's `reduceMotion` preference uses a static
poster with no video element. A saved preference is read before video mounts.

Add `loop.webm`, `loop.mp4` and `poster.jpg` under
`public/characters/{slug}/`, then fully reload the page in development. Files
that are absent are not requested. The server checks availability during local
page loads; production uses an availability snapshot embedded at build time so
CDN-hosted assets work without runtime filesystem access. Rebuild to ship newly
added production assets. The current repository contains no real character media.

Character and audio URLs use a one-year immutable cache. A new asset version
must use a new filename and updated registry path. Scene tests create tiny
synthetic fixtures temporarily and remove only the files they created.

See `CLAUDE.md` and `AGENTS.md` for project conventions. Auth and translations
were brought forward from the phased plan at the user's request.
