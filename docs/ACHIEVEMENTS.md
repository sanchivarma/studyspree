# Achievement configuration

`src/lib/achievements/definitions.json` is the canonical configuration for all
streak, banked-study-seconds and session-count milestones. Both client evaluation
and legacy streak projections read this registry. Earned badges are permanent.

After changing a definition, create a **new unused** migration:

```sh
node --experimental-strip-types scripts/generate-achievements.mjs NNNN_achievement_registry.sql
npx supabase migration up --local
npm run db:types
npm run test
npm run db:test
```

The generator refuses to overwrite a migration. The drift test compares the
latest generated migration with the canonical configuration. Applying the SQL
upserts definitions and refreshes eligible awards through trusted processing;
it never deletes earned records or lowers best streaks. Changes to streak
qualification remain a separate product/database decision.

The older achievement-awards table is retained as a compatibility projection;
its trigger now reads the same definitions rather than maintaining a second
hardcoded list. Ordinary clients cannot insert either kind of award.
