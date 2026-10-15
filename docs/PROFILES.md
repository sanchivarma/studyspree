# Profiles

Open `/profile` after signing in. Edit the display name, biography, country code,
occupation or study field, interests, partner preferences and up to five HTTPS
social links. Saving persists the complete validated form; errors keep the draft
available and roll the displayed card back to its previous data.

Profiles start private. The visibility checkbox explicitly shares the card with
signed-in members at `/people/{username}`. Email, legal names, timezone, camera
preferences and session history are never part of that response. The username
remains the account's existing sign-in identifier and is read-only here.

Real accounts can upload a profile photo (2 MB) and cover (5 MB), using PNG,
JPEG or WebP. The server checks file size, MIME and signature, generates a fresh
filename under the account's UUID, and commits the path after the upload succeeds.
Replacement removes the previous object after the new path is saved. Invalid
or unavailable images leave the initials/colour fallback visible.

The `profile-media` bucket is private. Images are served through an authenticated
no-store route that checks Storage RLS on each request. Making a profile private
revokes subsequent requests from other members, including requests to previously
known image paths. Images already downloaded by a viewer cannot be recalled.

Follow/unfollow uses real authenticated relationships, with a unique pair and a
database self-follow constraint. New follows require a public target. Changing
visibility hides the card without deleting existing relationships. Follower
and following counts are projected without exposing the relationship lists.

The development login is explicitly local: edits stay in `ss_directory_profile`
and the local greeting preference. It cannot publish, upload photos or impersonate
remote accounts. Session history remains in the existing local repository; this
feature does not activate the pending server session-storage migration.

## Implementation and checks

- `profileDirectory` has its own repository entry point; hooks wrap its typed
  operations without adding the account transport to the session import graph.
- Server actions validate every mutation, verify the user and use their Supabase
  client. No service-role key is used.
- Migration `0005_profile_directory.sql` adds cards, follows, narrow projection
  RPC, name synchronization, private bucket and owner/visibility policies.
- Generated database types come from the running local stack.
- `npm run db:test` covers privacy, cross-user writes, follow constraints,
  account-name synchronization and photo visibility revocation.
- `npx playwright test e2e/profile.spec.ts` covers the development preview.
- `npm run test:e2e:supabase -- e2e/supabase/profile.spec.ts` signs in two real
  local accounts via the local mailbox and checks editing, upload, refresh,
  visibility changes and follow/unfollow. Run the local Supabase stack first.

No new dependency was added. Profile translations live in `src/translations/profile`.
