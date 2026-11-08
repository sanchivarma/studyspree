# Dashboard study rooms

The Dashboard's primary action is “Let's Study”; its former tagline is removed.
The General Study Room stays pinned above permanent room tiles. Temporary
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

The paginated Dashboard list includes the viewer's permanent rooms, permanent
shared rooms they have joined, and public permanent rooms they can access.
Private Solo rooms never appear to other accounts. The General room is a
separate pinned item on every page. The Dashboard also accepts a room ID;
shared-room controls expose the ID and the existing share-link control.

Room preferences are deliberate saved room configuration. Normal fresh-session
cleanup still clears session choices and notes without deleting saved rooms.

## Deletion and access

The creator is the room admin. Their tiles include a trash button with an
accessible confirmation dialog and Cancel. The General room cannot be deleted.
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
temporary. Apply both migrations. Local migration application preserves data.

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

Validation on localhost:3000 (8 November 2026): typecheck, lint, 521 unit tests,
438 pgTAP assertions, production build and existing media gates pass. All four
room browser journeys pass without retries or skipped cases. Create Solo,
start saved Solo, delete, create Shared, join Shared and create Temporary measure
595, 566, 100, 575, 486 and 612 ms respectively. All 28 existing click cases also
pass: 35 timed actions at 118–1,008 ms, including all 21 navigation destinations
at 361–1,008 ms. One action exceeds the 1-second target by 8 ms; every action
meets the unchanged 2-second maximum. These are local production measurements,
not hosted deployment or external video-provider verification. The first browser
run exposed the remaining tagline, future session-room classification and a
select-label locator issue; the final complete rerun passes their regressions.
