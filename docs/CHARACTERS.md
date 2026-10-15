# Virtual study partners

Themes choose the environment; characters add illustrated study company. Characters are prerecorded original animations, not live people or conversational AI. They never request a camera or microphone.

## Try locally

1. Sign in and open `/study`.
2. Open **Choose companions** and select **Virtual partners**.
3. Select any of the eight cards. The initial selection is Noah; cards toggle independently. Removing every selection returns to Solo.
4. Close the picker, choose a theme/duration, and press Start.
5. Refresh during the session: the ID, original start timestamp, theme preference, and companion snapshot remain available.
6. Move the pointer or press a navigation key to restore the controls. **Choose companions** changes the running session's selection; Finish banks elapsed time normally.
7. **Hide companions** removes the animated tiles; **Show companions** restores them.

The eight default adults are Noah, Amir, Leo, Kai, Maya, Zara, Mei, and Eva. Four are male and four female. People mode is disabled until real room infrastructure is available.

## Media

Each versioned GIF has 32 frames and loops every 4.8 seconds. The original source is `scripts/generate-character-loops.mjs`, which renders vector frames through the existing Next.js installation's sharp tooling. No external artwork or new runtime library is used. See `public/characters/LICENCES.md` for provenance.

- GIF: `public/characters/{slug}/study-v1.gif`, budget 2 MiB.
- Poster: `public/characters/{slug}/poster-v1.webp`, budget 256 KiB.
- `npm run check:character-assets` validates headers, animation frames, infinite looping, uniqueness, size, posters and ledger coverage.
- `node scripts/generate-character-loops.mjs` preserves existing immutable v1 files.
- `scripts/prepare-character-loop.sh source.mp4 male-01` prepares a replacement source only when its target files do not already exist. A published revision needs new filenames and matching registry/ledger entries.

Picker previews animate for the hovered/focused desktop card. Session animations unmount when offscreen or the document is hidden. Reduced-motion preferences render static posters. Media failure never prevents Start or Finish.

## Persistence

`Profile.companionPreferences` stores future-session defaults. `Session.companions` snapshots the selection for that session. Missing legacy values read as Solo without resetting history. Editing a running session changes its companion metadata through the repository, preserving every accounting field. Ended session selections are immutable.

The current session implementation is LocalRepository. Migration `0004_virtual_companions.sql` prepares equivalent database columns, validation and ended-session protection. Its SQL tests and generated database types must be run when local Supabase/Docker is available; this document does not claim the server storage adapter is active.
