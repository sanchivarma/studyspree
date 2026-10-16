# Email invitations

People and Contacts link to `/invite`. Both a registered account and the development `ss_admin` preview can invite someone. Preview mode still keeps personal study history local and cannot impersonate a database account to join shared rooms. Registered accounts navigate directly to shared spaces without depending on a dashboard query finishing.

## Use an existing Gmail account

No paid email API or custom sending domain is required for this option. Use a mailbox you control, within its provider's sending limits.

1. Enable Google 2-Step Verification and create an [app password](https://support.google.com/accounts/answer/185833). Account or organization restrictions can make app passwords unavailable.
2. Put these server-only values in `.env.local`:

```dotenv
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-address@gmail.com
SMTP_PASS=your-app-password-without-spaces
INVITATION_FROM=your-address@gmail.com
INVITATION_SITE_URL=https://your-public-studyspree-address
```

3. Restart StudySpree after changing credentials. The server chooses SMTP when SMTP credentials are present. Use your Gmail address for `INVITATION_FROM`, replacing any earlier Resend sender. If omitted, the sender defaults to `SMTP_USER`. If `INVITATION_EMAIL_TRANSPORT` was explicitly set to another provider, set it to `smtp`.
4. Open People → Invite by email, enter the recipient address and send.

Use an app password, not your normal Google password. Credentials never enter the browser or repository. A public HTTPS app address is required for external invitations: a recipient cannot open your laptop's `localhost`.

Port 465 uses TLS immediately. Port 587 requires STARTTLS. Certificate checking stays enabled. Gmail/provider quotas still apply; StudySpree also reserves at most five email attempts per sender per hour.

## Local testing without credentials

When connected to local Supabase and no SMTP/API sender is configured, invitations are captured through the existing local Mailpit service. They do not reach a recipient's real inbox. The form and success message explicitly identify local capture, with a link to http://localhost:54324.

For isolated tests with existing sender credentials, start a separate verification instance with `INVITATION_EMAIL_TRANSPORT=mailpit`. This override is accepted with local Supabase. `smtp` and `resend` can also explicitly select a configured sender. Do not change the normal instance's delivery settings just to run a test.

No account is created for the recipient when sending. The join link opens the Register tab at `/login?invite=1`. The recipient chooses whether to register or use the existing login options. Email invitations grant no room membership or access to private study records.

## Optional Resend alternative

Instead of SMTP, configure `RESEND_API_KEY`, `INVITATION_FROM` and `INVITATION_SITE_URL`. Sending access is sufficient. Sender verification and the provider's plan limits apply. No subscription or payment is activated by this code.

## Verification

```sh
npm run typecheck
npm run lint
npm test
npm run db:test
npm run test:e2e -- email-invitations.spec.ts dashboard.spec.ts
npm run test:e2e:supabase -- email-invitations.spec.ts
```

Ordinary requests use the signed-in user's Supabase client. Migration 0020 adds an RLS-protected reservation ledger storing recipient hashes rather than addresses/bodies. Preview throttling is development-only, keyed by username so a fresh login does not reset its limit. Delivery errors are never reported as success. The SMTP implementation uses Nodemailer; the optional API and local capture paths use native fetch.
