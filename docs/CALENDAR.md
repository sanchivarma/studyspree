# Calendar, contacts and shared sessions

- [x] Calendar icon in the primary navigation, with month navigation and daily reading bars.
- [x] Completed reading history and scheduled sessions on the same monthly calendar.
- [x] Title, start and end date/time in the profile timezone, including multi-day schedules and DST disambiguation.
- [x] Shareable room/session ID and URL; personal timers can generate a private invitation without changing their timestamps.
- [x] Contacts icon, username-based requests and recipient acceptance.
- [x] Private contact lists; invite individual accepted contacts or entire lists when scheduling.
- [x] Pin self-video first in a shared room or move the local self-view into the personal session grid.
- [x] Narrow video margins and a mixed grid of real people and the eight virtual partners.

## Try it

1. Sign in with a real Supabase account. Open Contacts, enter another account's username and send a request.
2. That person opens Contacts and accepts. Create a named contact list from accepted contacts.
3. Open Calendar. Enter a title, future start and later end (up to 31 days), then select contacts or lists.
4. Invitees open Calendar, select the scheduled day and accept. They can open the shared room when its scheduled interval is active. The host is booked automatically.
5. The calendar shows a shareable room ID/link. Private rooms still require membership; copying a URL never grants access by itself. Personal-session Share creates a bounded invitation link that recipients can accept after signing in.
6. In a room, choose virtual partners and optionally share your camera. Pin my video first places your tile before other participants. Grid view still includes human and virtual tiles together.
7. For a local preview, enable the local camera during a personal session and choose Pin my video first. This keeps the stream local and does not enable room publication.

Reading dates preserve the saved historical local date. Scheduled timestamps display in the current profile timezone. Your calendar includes hosted, booked and invited sessions; public session discovery remains separate.

## Verification

```sh
npm run typecheck
npm run lint
npm test
npm run db:test
npm run test:e2e:supabase -- calendar.spec.ts livekit.spec.ts
npm run test:e2e -- self-view-pin.spec.ts webcam-privacy.spec.ts start-flow.spec.ts
```

Database changes are migrations 0017 through 0019. Existing history is preserved. No new dependencies are needed.

Verified locally: typecheck, lint, production build, 341 unit tests, 148 database assertions, two real-account calendar/LiveKit journeys, and 21 Start/local-camera/privacy cases. The camera audit retains its full twenty-second observation period.

Run one development server per checkout. `npm run dev` uses port 3000 explicitly, so a duplicate invocation exits instead of silently starting on another port and sharing generated files. Production output remains separate in `.next`.
