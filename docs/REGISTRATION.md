# Registration

`/register` and the Register tab on `/login` share the same form. Validation runs in
the browser and on the server. Names are required (1–80 characters); email is
trimmed and lowercased; usernames are lowercase letters, digits and underscores
(3–30 characters); passwords are 8–64 characters with matching confirmation.
Supabase may enforce additional password requirements, which the form reports.

The server uses the existing secret-protected `lookup_login_email` RPC, which
joins `profiles` to `auth.users`. Configure `SUPABASE_USERNAME_LOOKUP_SECRET`
and its existing database hash as for username login. No admin key is used and
the lookup email is never returned to the browser. The existing database unique
constraint is the final authority for concurrent username claims.

Account creation calls Supabase Auth `signUp`. Keep email confirmation enabled.
The welcome message and activation link are delivered together through the
Supabase confirmation template in `supabase/templates/confirmation.html`.
The link uses the existing `/auth/confirm` token-hash handler and works across
browsers without relying on the signup browser's PKCE verifier.

## Local setup

Start Docker Desktop and the local Supabase stack (`npm run db:start`). After
changing the email template configuration, restart the stack without resetting
the database. Run `npm run dev` and visit `/register`. Create an account, open
the captured welcome email at http://127.0.0.1:55324 and follow its confirmation
link to onboarding. Reuse the username with another email to see its validation
message. Local Mailpit captures mail; it does not send to a real inbox.

## Hosted setup

Local `config.toml` does not update hosted Supabase. In the project's Auth email
templates, set Confirm signup to the contents of `confirmation.html` and the
subject to “Welcome to StudySpree — confirm your email”. Configure Auth SMTP,
enable email confirmations, set Supabase Site URL and the app's `SITE_URL` to the
deployed application origin, and allow its `/auth/callback` redirect URL.
Application invitation SMTP variables do not configure Supabase Auth mail.

## Verification

Run `npm run typecheck`, `npm run lint`, and `npm run test`. With the app running,
run `npx playwright test e2e/registration.spec.ts` for form validation. With the
local Supabase stack and welcome template loaded, run
`npm run test:e2e:supabase -- registration.spec.ts` for username duplication,
captured welcome mail, and confirmation from a different browser context.

During implementation, typecheck, lint, all 547 unit tests, and the form browser
check passed. The Supabase browser journey could not complete because Docker's
local daemon was unavailable; no real-inbox delivery has been verified.

Reference: https://supabase.com/docs/guides/local-development/customizing-email-templates
