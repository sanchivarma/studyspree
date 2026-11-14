# Registration

`/register` and the Register tab on `/login` share the same form. Validation runs in
the browser and on the server. Names are required (1–80 characters); email is
trimmed and lowercased; usernames are lowercase letters, digits and underscores
(3–30 characters); passwords are 8–64 characters with matching confirmation.
Supabase may enforce additional password requirements, which the form reports.
The required 18+ declaration is validated on the client and server; its policy and
server timestamp are included in Auth metadata. It is self-declaration, not identity
or age verification. See `EU_PRIVACY_REVIEW.md` for outstanding legal decisions.

The form calls `POST /api/auth/username`, then `POST /api/auth/register` if the
username is available. Login calls `POST /api/auth/login`. They do not POST page
server actions to `/login`. The registration endpoint repeats the username check
because a caller may skip the first endpoint or another request may claim the name.
Login reuses the identity already verified by `signInWithPassword` instead of
making an additional `getUser` call. Auth APIs expose `Server-Timing` to measure
backend time separately from browser/rendering time. They bypass unrelated session
refresh work in middleware. Development route compilation still has a cold-start
cost; use the optimized preview build for representative latency measurements.
The performance acceptance target is 500 ms with a hard 1,000 ms ceiling for
each API and complete click-to-ready action. `e2e/auth-performance.spec.ts` tests
real username/login/logout calls and complete login/sign-out transitions without
mocking the backend. Passing functional checks alone does not establish this
budget, and successful registration/email delivery must also be measured once
sender verification is complete. Do not commit or report completion before the
required latency checks pass.
Login form focus preloads dashboard/navigation code while credentials are
entered, without fetching account data before authentication. The idle dashboard
loads saved rooms and active-session data on mount without interval polling;
explicit mutations still invalidate their affected queries. Live room/chat
screens retain their separate updates and active sessions retain their heartbeat.
Sign Out calls `POST /api/auth/logout`, clears both development and Supabase
sessions, clears account query data, and reloads `/login` to discard cached
authenticated layouts. Supabase logout applies to the current session.

Field errors are orange-red with an exclamation icon and invalid-field borders.
Account-creation service errors show a red message and retain entered details.
They generate a redacted server event with a request ID and category, without
names, email addresses or passwords. Network errors use separate wording and do
not claim that a server logged a request it never received. Successful registration
clears the form and opens an accessible email-confirmation modal.

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

Start Docker Desktop. Choose `AUTH_EMAIL_TRANSPORT=mailpit` for isolated capture,
`resend` with `RESEND_API_KEY`, or `smtp` with the existing SMTP variables. Set
`AUTH_EMAIL_FROM` to a verified sender (falls back to `INVITATION_FROM`/`SMTP_USER`).
Run `node scripts/start-local-supabase.mjs`. The wrapper loads `.env.local` and
sets the CLI SMTP overrides. A running stack must be stopped and restarted for
configuration changes; preserve its volumes and never run a database reset for
email setup. `supabase start` returns success for an already-running stack without
applying changed SMTP settings, so inspect the effective auth SMTP host afterward.

Run `npm run dev` and visit `/register`. With capture selected, inspect the welcome
email at http://127.0.0.1:55324. With real SMTP selected, inspect the recipient's
inbox. Follow the activation link to onboarding; reuse the username to see its
validation message. Mailpit captures mail and does not send to a real inbox.

The owned domain is `studyspree.ai`, registered through Namecheap. The previous
`studyspree.com` sender was rejected by Resend as unverified. At review time the
public DNS for `.ai` did not contain Resend DKIM or `send` MX/SPF records. Add the
exact account-specific records from Resend to Namecheap DNS and complete Resend
verification before claiming real-user delivery. Do not guess a DKIM key or change
unrelated DNS records. The current sending-only Resend key cannot manage domains.

## Hosted setup

Local `config.toml` and the local startup wrapper do not update hosted Supabase. In the project's Auth email
templates, set Confirm signup to the contents of `confirmation.html` and the
subject to “Welcome to StudySpree — confirm your email”. Configure Auth SMTP,
enable email confirmations, set Supabase Site URL and the app's `SITE_URL` to the
deployed application origin, and allow its `/auth/callback` redirect URL.
The local wrapper explicitly maps configured credentials into Auth SMTP settings;
setting invitation credentials without this step does not configure Auth delivery.

## Verification

Run `npm run typecheck`, `npm run lint`, and `npm run test`. With the app running,
run `npx playwright test e2e/registration.spec.ts` for form validation. With the
local Supabase stack and welcome template loaded, run
`npm run test:e2e:supabase -- registration.spec.ts` for username duplication,
captured welcome mail, and confirmation from a different browser context.

Use real SMTP only for explicitly authorized recipient tests; the integration suite
uses reserved `.test` addresses and requires local capture. Real-inbox delivery is
not established by SMTP authentication alone: the provider must accept the sender
domain and the email, and final delivery should be checked separately.

Reference: https://supabase.com/docs/guides/local-development/customizing-email-templates
