# Supabase setup for StudySpree

The application uses Supabase for real accounts. Live sign-in needs the
following setup.

For a local preview, the development test account is configured in
`.env.local` with `DEV_ADMIN_USERNAME`, `DEV_ADMIN_PASSWORD` and
`DEV_ADMIN_SESSION_SECRET` (at least 32 random characters). Restart
`npm.cmd run dev` after changing these values. This preview login is
disabled in production and grants no Supabase or database admin access.
Keep `.env.local` out of version control.

## 1. Create a project and configure the app

Create a project at https://supabase.com/dashboard. Choose an EU region if
you want account data hosted in the EU. Save the database password privately.

Copy `.env.example` to `.env.local`. From the project's Connect dialog,
set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
Set `SITE_URL=http://localhost:3000` for local development.

Do not use a service-role or secret API key in either public variable.
No Supabase service-role key is needed by this app.

## 2. Apply the new database migration

In **SQL Editor**, open a new query and paste the contents of
`supabase/migrations/0001_auth_profiles.sql`. Run it once, before registering
accounts. It creates the RLS-protected profile table, automatic profile
creation and the guarded username lookup. It does not change an existing
migration or existing user accounts.

If you already created accounts before applying this migration, they do
not have profiles automatically. Tell the developer before proceeding so
those accounts can be migrated safely.

## 3. Set the private username lookup secret

Supabase password sign-in accepts email or phone. The app resolves a
username on the server, then passes the email to Supabase Auth. This avoids
publishing a username-to-email directory or using an admin API key.

Generate a private random value and its hash in your local terminal:

```powershell
node -e "const c=require('node:crypto'); const s=c.randomBytes(32).toString('hex'); console.log('SECRET: '+s); console.log('HASH: '+c.createHash('sha256').update(s).digest('hex'))"
```

Put the SECRET value in `.env.local` as `SUPABASE_USERNAME_LOOKUP_SECRET`.
Keep it private and do not prefix its name with `NEXT_PUBLIC_`.

Put only the HASH value in this SQL Editor query, then run it:

```sql
insert into auth_private.login_config(singleton, secret_hash)
values (true, 'PASTE_HASH_HERE')
on conflict (singleton) do update set secret_hash = excluded.secret_hash;
```

The database stores the hash. The app keeps the original secret server-side.
Without this step, username/password login cannot resolve usernames.

## 4. Configure authentication redirects and emails

In **Authentication → URL Configuration** set the Site URL to
`http://localhost:3000`. Add these redirect URLs:

- `http://localhost:3000/auth/callback`
- `http://localhost:3000/auth/callback?next=/reset-password`
- `http://localhost:3000/auth/confirm`

Leave email confirmation enabled. For confirmation links that work across
devices, use this URL in **Authentication → Email Templates → Confirm signup**:

```text
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup
```

For **Reset password**, use:

```text
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery
```

The app also supports PKCE callback links on the browser that initiated
the request. Confirmed registration and OAuth go to `/home`; recovery
goes to `/reset-password`.

## 5. Enable Google and Facebook

Google sign-in also works for Gmail accounts. It requires a Google OAuth
client ID and secret. Facebook needs a Meta app ID and secret.

In **Authentication → Sign In / Providers**, enable each provider and follow:

- https://supabase.com/docs/guides/auth/social-login/auth-google
- https://supabase.com/docs/guides/auth/social-login/auth-facebook

Use the **Supabase callback URL shown in the provider settings** in the
Google/Meta console. That provider callback is different from the app's
`http://localhost:3000/auth/callback` redirect.

Provider client secrets belong in Supabase, not browser code or Git.
Until a provider is enabled, its button cannot complete sign-in.
OAuth accounts get a unique generated username in the profile table.

## 6. Restart and test

```powershell
npm.cmd run dev
```

1. Open `http://localhost:3000` and choose a language using the globe.
2. Register using all five fields. Check the confirmation email.
3. Confirm the account. `/home` shows the actual username, tagline and
   link to Study. It contains no duration controls or timer.
4. Choose the BookOpen icon to open `/study`. This is the session setup
   screen; the timer/session demo routes are still placeholders at this phase.
5. Sign out and sign in with the same username/password.
6. Test Forgot password and both OAuth providers after configuring them.
7. Visiting `/home`, `/study` or session routes signed out redirects to `/`.

## Verification limits

Unit tests cover validation, username lookup behavior, callback redirects
and translation completeness. `supabase/tests/auth_profiles.sql` supplies
transactional pgTAP checks for RLS and private lookup behavior. Run those
with a local Supabase database after applying the migration.

Live email delivery, provider credentials, database migration and real
account flows must be verified against your project. They cannot be
confirmed using placeholder keys or mocked tests.

For deployment, update `SITE_URL`, the Supabase Site URL and the allowed
redirects to your HTTPS domain. Review Supabase rate-limit, SMTP and
CAPTCHA settings before public launch.

References: https://supabase.com/docs/guides/auth/server-side/creating-a-client
and https://supabase.com/docs/guides/auth/passwords
