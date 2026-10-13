# StudySpree — master context

PROJECT: StudySpree — a silent study-companion web app.
A user picks an illustrated character who studies beside them in a looping
video scene. They run a timer, bank hours, and watch progress accumulate.
Tagline: "Be seen without being watched."

STACK: Next.js 15 App Router, TypeScript strict, Tailwind, shadcn/ui,
Zustand, TanStack Query, date-fns + date-fns-tz. Backend (later): Supabase.
Hosting: Vercel.

NON-NEGOTIABLE RULES
1. Total hours only ever increase. No code path may decrement a user's
   stored time. No decay, no penalty, no reset of lifetime totals.
2. Duration is derived from timestamps (startedAt, endedAt). The UI never
   sends or stores a duration it computed from a ticking counter.
3. The webcam stream never leaves the device. No upload, no recording,
   no WebRTC, no canvas capture sent anywhere.
4. Copy rule: no UI text may imply failure, quitting, falling short or
   guilt. "Finish", never "Give up". Zero days are neutral grey, never red.
5. All "current time" reads go through now() in src/lib/clock.ts. Never
   call Date.now() or new Date() directly in app code.
6. UI components never access localStorage or Supabase directly. They use
   hooks, which use the repository interface in src/lib/repo/.
7. Animate only transform and opacity. Never layout properties.
8. Respect prefers-reduced-motion everywhere.

STYLE: calm, dark, unhurried. The character video is the hero; UI recedes.
Rounded corners, soft shadows, generous spacing, one accent colour per
character. No gamified clutter.

When you finish a task, list: files created, files changed, and the exact
steps for me to test it locally.

Read AGENTS.md for the full repository conventions.
