# StudySpree registration and EU privacy review

Implementation review: 14 November 2026. This is an engineering checklist, not a
determination that the service complies with all applicable laws. The operator's
country, business model, intended audience and processor contracts still need review.

## Implemented for password registration

- Required, unchecked 18+ self-declaration, validated in the form and registration
  API. The declaration, policy and server timestamp are recorded in Auth metadata.
  No birth date, identity document or phone number is collected for this check.
- Supabase email confirmation remains enabled. The welcome message contains an
  activation link and a separate link to sign in. It never includes a password.
- Server-only sender credentials, field validation, same-origin API checks,
  request limits, private/no-store auth responses and redacted error events.
- The webcam remains local to the device under the existing privacy contract.

## Age policy: decisions before a public launch

18+ is the proposed product policy; it is not COPPA's statutory age threshold.
COPPA principally concerns children under 13 in the US. GDPR Article 8 addresses
consent-based information-society services offered directly to children: its
default age is 16, with national laws permitted to lower it to no less than 13.
That rule does not establish a universal age for all online contracts or all
processing of children's data.

A checkbox is self-declaration, not verified age assurance. Confirm whether the
service is likely to be accessed by children and which DSA obligations apply.
Do not describe this checkbox as “COPPA compliant”, “GDPR compliant” or proof of
an adult's identity. Apply a consistent policy to OAuth, magic-link signup and
onboarding too before relying on an adults-only service policy.

## Outstanding privacy work

1. Identify the controller: legal person/company, country and privacy contact.
   Publish the Article 13 notice at collection, including purposes, lawful bases,
   recipients, international transfers/safeguards, retention, rights, complaint
   authority and consequences of required information. No public operator details
   have been invented or published in this task.
2. Determine any separate legal-notice obligation. In Germany, DDG section 5 can
   require the operator's name and establishment address for covered services.
   A home address and telephone number are not automatically added to the app;
   whether a business/service address is sufficient requires a valid arrangement
   and jurisdiction-specific advice. Do not promise anonymity for the operator.
3. Review whether first and last name both need to be required. Prefer collecting
   the minimum personal data needed for the service.
4. Establish retention/deletion rules and test access, correction, deletion and
   portability procedures. A profile visibility setting does not replace these.
5. Confirm Supabase, Resend and any LiveKit data regions, DPAs, subprocessors and
   transfer safeguards. Document who receives account and communication data.
6. Review cookies/local storage and integrations. Separate strictly necessary
   storage from any optional analytics or tracking and obtain consent where
   required before enabling the latter. Keep marketing consent separate from
   account registration; this welcome email is transactional.
7. Review platform duties for public rooms, chat, reporting, moderation and minors,
   and document breach response, access controls and operational log retention.
8. Publish accurate terms, privacy and operator notices after the above decisions.
   Do not launch with placeholder contact details or an unsupported compliance claim.

## Primary sources

- GDPR Articles 5, 6, 8, 12–22, 28, 32–35 and 44 onward:
  https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32016R0679
- FTC COPPA FAQ:
  https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions
- EDPB Statement 1/2025 on age assurance:
  https://www.edpb.europa.eu/our-work-tools/our-documents/statements/statement-12025-age-assurance_en
- European Commission DSA minors guidelines:
  https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=CELEX%3A52025XC05519
- Germany DDG section 5:
  https://www.gesetze-im-internet.de/ddg/__5.html
