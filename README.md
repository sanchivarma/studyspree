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

See `CLAUDE.md` and `AGENTS.md` for project conventions. Auth and translations
were brought forward from the phased plan at the user's request.
