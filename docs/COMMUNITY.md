# Shared features

Use a real local Supabase account for shared features. The development test login keeps its existing offline personal-session repository and cannot impersonate a database user. `/login` sends magic links to the local inbox at http://localhost:54324.

The navigation's More menu opens Spaces, Focus partners, Buddy discovery, Conversations, Groups, Feed, Schedule, Leaderboards, Tasks, Notifications, Search, Feedback, Plans and Preferences. Profiles, Settings, Study and Stats remain on the main navigation.

Calendar and Contacts also have primary navigation icons. [Calendar guide](CALENDAR.md) covers monthly reading history, dated sessions, contact lists, invitations, shareable session links and pinned self-video.

## Data boundaries

Real account sessions now use the server repository. Starts and finishes run atomic Postgres RPCs: timestamps, capped actual seconds, day totals, streaks and achievements are server-owned. Saved session dates remain fixed when the profile timezone changes. The development preview retains LocalRepository. A page refresh does not create a new timer.

All community tables have RLS. Ordinary API requests use the signed-in user's client and explicitly authorized RPCs, never a service key. Private groups require approval. Group owners transfer ownership before leaving; moderators manage members. Direct messages require recipient consent or a published buddy listing. Blocks suppress social content and prevent shared room presence. Message retries use a unique client ID. Attachments use private storage, signature/MIME/size checks and authenticated delivery.

Room visits, not timer ticks, determine shared time. Intersections are merged before calculating partner time. Favorites and notification choices are private. Rankings use trusted study totals, explicit opt-in and five-minute snapshots; opting out revokes visibility immediately.

## Camera boundaries

Settings self-view remains a local preview: its stream never enters LiveKit. A room has a separate, explicit **Share camera in this room** button and a separate camera lifecycle. Room cameras never publish microphone audio. GIF partners stay in the browser and consume no LiveKit participant minutes. Turning room sharing off disconnects publishing and removes the Cloud participant; a fresh subscription connection restores viewing.

## Limits and maintenance

`plan_policies` defines daily room seconds, pin limits and visible partner rows. Null means unrestricted. No prices, purchases or checkout have been enabled. Configure policies through trusted administration; clients cannot grant themselves allowances. Daily time is the union of room intervals in the profile timezone.

Run the protected `GET /api/cron/study-leases` endpoint every minute using `Authorization: Bearer <CRON_SECRET>` from your deployment's scheduler. It closes stale room visits and stale personal sessions, resets monthly freezes and removes expired/unauthorized LiveKit participants. Server credentials stay on the server. Local development can run `npm run maintenance` in a second terminal. A token expiring by itself does not disconnect an existing LiveKit connection, so production must run this scheduler to enforce media leases while clients are closed.

## Verification

With Docker/local Supabase and the app running:

```sh
npm run db:test
npm run test:e2e:supabase -- community.spec.ts
npm run test:e2e:supabase -- livekit.spec.ts
npm run test:e2e -- webcam-privacy.spec.ts start-flow.spec.ts
```

The LiveKit test uses Chromium's fake camera and two real local accounts. It makes a brief connection to the configured Cloud project; it does not activate a paid plan. Keep the independent self-view privacy test in CI.
