# StudySpree

Be seen without being watched.

## Local development

Requires Node.js 22 and npm.

```sh
npm install
npm run dev
```

Open http://localhost:3000. Prompt 1.2 now shows the Rainy Desk placeholder
scene. `/session/demo`, `/session/demo/complete`, `/stats`, and `/settings`
are blank route scaffolds for subsequent prompts.

On Windows PowerShell, use `npm.cmd` if script execution policy blocks `npm.ps1`.
Development uses `.next-dev` and production builds use `.next` so building
does not disturb a running dev server. If changing this config while a dev
server is open, restart that server once.

```sh
npm run typecheck
npm run lint
npm run test
npm run build
```

## Foundation

- Next.js 15 App Router, strict TypeScript, Tailwind CSS 4.
- shadcn/ui manual configuration: new-york, slate, CSS variables; no UI
  components added yet. `clsx` and `tailwind-merge` implement the `cn` helper;
  `class-variance-authority` supports future shadcn component variants, and
  `tw-animate-css` supplies their animation utilities.
- TanStack Query provider and Framer Motion reduced-motion policy.
- Zustand, date-fns, date-fns-tz, Zod, Framer Motion, Lucide and clsx are
  installed as requested for later phases; there is no feature logic yet.
- Vitest verifies the clock's development and production behavior.

## Clock

All current-time reads use `now()` from `src/lib/clock.ts`.
In development, `setDevOffset(ms)` persists a browser offset under
`ss_dev_clock_offset_ms`; `clearDevOffset()` restores real time.
Server rendering uses real time because browser storage is unavailable.
Production ignores offsets and the setters do nothing.

Inter is loaded through `next/font` at build time and served locally at
runtime. The initial development compile and production build need access
to Google Fonts; this does not add a runtime font request.

See `CLAUDE.md` and `AGENTS.md` for the project's rules.

## Placeholder scenes (Prompt 1.2)

The character registry is `src/lib/characters/registry.ts`.
`ScenePlaceholder` accepts `slug` and optional `className`; it fills a
positioned parent, or the viewport when no ancestor is positioned.

To preview each scene, change the `slug` in `src/app/(app)/page.tsx` to
`rain-desk`, `night-shift`, `balcony-dusk`, or `dorm-bunk`, then save.
The default is `rain-desk`. No media files or network calls are needed
for these backgrounds.

Watch for the very slow 40-second movement. Enable reduced motion in
your OS or browser to see a still scene. Switching tabs pauses the
animation; returning resumes it. Resize the browser to check full-bleed
coverage, film grain and darker edges.
