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
- `/session/demo`: visual session with static progress, optional task, idle
  controls and Finish/Escape navigation. `/session/demo/complete` is a placeholder.
- `/stats` and `/settings`: protected placeholders.
- `/reset-password`: password update after a valid recovery link.

English, German, French, Polish and Italian copy lives in separate JSON
files under `src/translations/{common,login,register,recovery,home,study,session}/`. The globe updates visible text, accessible
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

See `CLAUDE.md` and `AGENTS.md` for project conventions. Auth and translations
were brought forward from the phased plan at the user's request.
