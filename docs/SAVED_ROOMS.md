# Dashboard study rooms

The Dashboard's primary action is “Let's Study”; its former tagline is removed.
StudySpree General Study Room I stays pinned above permanent room tiles. Temporary
sessions no longer appear in this list or in a separate latest-room card.

## Creating and returning

“Create room” offers a name and three types, starting with an empty partner
selection each time the form opens:

- **Temporary:** an unlisted shared room for the creator's next session. Its
  first creator session becomes its lifetime boundary. Finishing or browser
  lease cleanup closes access. It never appears in the permanent-room list.
- **Permanent Solo:** private to its creator. The room remembers its own table,
  window and theme. It starts an ordinary personal Solo session, without shared
  presence or LiveKit. Changing scenery while that session is active updates
  this room; unrelated later Settings changes leave it intact.
- **Permanent Shared:** an unlisted reusable room, accessible to signed-in users
  with its URL or UUID. Its virtual partner controls persist. Human participants
  can join later. Finishing an individual session leaves the room available.

The paginated Dashboard list reads the separate RLS-protected
`saved_study_rooms` table, keyed by `(user_id, room_id)`. Creating a permanent
room or joining one through its URL, ID or invitation saves it for that user.
Temporary rooms are never saved. Public visibility alone does not save a room.
Private Solo rooms never appear to other accounts. The General room is a
separate pinned item on every page. The Dashboard also accepts a room ID;
shared-room controls expose the ID and the existing share-link control.

Room preferences are deliberate saved room configuration. Normal fresh-session
cleanup still clears session choices and notes without deleting saved rooms.

## Deletion and access

The creator is the room admin. Every saved tile has a cross at its top left,
with an accessible confirmation dialog and Cancel. For an admin, confirmation
deletes the room for everyone and atomically clears every saved record. For
a guest, confirmation removes their own saved record, preserving the room and
its membership; joining later saves it again. Other open Dashboards refresh
every five seconds. The General room has no cross and cannot be removed.
Deletion is idempotent and retains the room UUID as a tombstone. Subsequent room
reads return a minimal deleted state, rendered as “Room with this ID is deleted.”
They expose no old title, partner configuration or messages. Joining, chat and
shared presence are revoked; existing study history is retained.

An occupied deleted room displays the participant's own timer and Finish control
alongside the deletion message. It does not forcibly finish another person's
session. The same Finish fallback is available when a temporary room closes.
Current room observers discover deletion through the existing three-second poll;
server access checks reject new joining/chat requests immediately. LiveKit
connections disconnect when the client observes the revoked presence. This
does not establish external provider availability.

## Data and verification

Migration `0078_dashboard_saved_rooms.sql` extends the existing RLS-protected
room model and RPCs, adds per-room scenery and a personal-session association,
and uses an owner-checked RPC to restore/start Solo rooms atomically. No service
role is used for ordinary requests. Apply this migration to a hosted database
before deploying this app version. Migration `0079_classify_session_bound_rooms.sql`
also classifies future rooms created by ordinary Study/People session RPCs as
temporary. Migration `0080_personal_saved_rooms.sql` adds personal bookmarks,
owner/guest removal semantics and the General room copy. Apply all three migrations. Local migration application preserves data.

`supabase/tests/saved_rooms.sql` tests visibility, Solo restoration, independent
Settings, temporary closure, shared participation, deletion permissions,
idempotence, tombstone privacy, guest-controlled Finish and preserved history.
`e2e/supabase/saved-rooms.spec.ts` exercises the UI across separate browser
contexts, including deletion while a guest is present. New create/start/join/
delete actions use the existing 1-second target and fixed 2-second maximum in
`e2e/performance/budget.ts`. The previous public-session browser regression now
checks the requested absence of temporary Dashboard tiles while retaining its
public discovery API, copied link, partner, participant-count and timer checks.

No dependencies or media assets were added.

## Local three-person testing

`node scripts/prepare-local-laptop-accounts.mjs` verifies `ss_admin` and prepares
`ss_test_1` and `ss_test_2`, all with the existing local admin password. Their
user IDs are distinct. Credentials are never printed. This script refuses a
nonlocal Supabase database and does not reset existing profiles or study history.

Other laptops can open `http://192.168.178.30:3000` while this computer runs the
production preview and is reachable on the same network. Browser UUID generation
uses cryptographic random bytes on LAN HTTP, where native randomUUID is absent.
API origin checks compare against the actual Host header because Next can normalize
its internal URL to localhost; foreign origins and forwarded-host spoofing remain
rejected.
Camera access requires HTTPS (or localhost on the host computer); HTTP LAN testing
covers accounts, rooms and text chat.

`node scripts/clean-local-test-accounts.mjs` audits generated `@example.test`
accounts without changing data. `--apply` permanently deletes those accounts and
their generated history; the three named logins and all non-test history are
preserved. Cross-account history references retain deleted room tombstones.
Deletion is currently awaiting explicit approval after automatic review blocked
removal of generated study history. Existing test and temporary rooms have been
soft-deleted, preserving history.

Validation on localhost:3000 (8 November 2026): typecheck, lint, all 534 unit
tests, 460 pgTAP assertions, production build and asset checks pass. All four
room browser journeys pass; seven measured room actions take 93?605 ms against
the unchanged two-second maximum. All three named accounts also pass real LAN
browser sign-in and reload checks, without starting sessions or creating rooms.
All 28 click tests pass with 35 timed actions at 95?1,320 ms. Three actions
exceed the one-second target; all meet the unchanged two-second maximum.
Post-verification cleanup leaves no visible temporary or generated test rooms.
These are local measurements, not hosted or external video-provider verification.
