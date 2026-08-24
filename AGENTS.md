# AGENTS.md

## Source of Truth

**`SPECS.md` is the single source of truth for all product requirements, features, UX, data requirements, and scope.**

Before implementing anything:

1. Read the relevant parts of `SPECS.md`.
2. Inspect the existing code.
3. Make the smallest coherent change.
4. Do not invent or duplicate product requirements here.

This file contains engineering rules only.

## Stack

Unless explicitly changed:

- TypeScript
- React
- Tauri
- Supabase (Postgres + Auth) via `@supabase/supabase-js`
- Tailwind CSS
- Zod
- Vitest
- Playwright

The PDF/document-rendering technology is not fixed until it has been validated with a prototype.

## Architecture

Keep these concerns separate:

```text
React UI
   ↓
Application / Services
   ↓
Domain
   ↓
SQLite / Repositories

Estimate data + Template
          ↓
    Document Renderer
          ↓
        PDF
```

Do not put business logic or database access directly in React components.

Do not hard-code document layout coordinates throughout the application. Keep presentation in templates/rendering code.

## Data Integrity

Use stable IDs and structured data.

Do not use formatted strings as the source of truth for calculations.

Money must use a safe numeric representation; formatting belongs to the UI/rendering layer.

Finalized estimates must remain reproducible even if customers, library items, templates, or settings change later. Use snapshots/versioning where necessary.

All database schema changes require migrations.

## Accounts & Data

Every user signs in (email/password, with email confirmation and optional TOTP two-factor login)
via Supabase Auth before using the app; there is no offline/local-only mode. All persisted data
lives in Supabase Postgres, scoped per-account by Row Level Security (`supabase/schema.sql`) —
never rely on client-side filtering alone to keep one account's data private from another.

A full account data export/import exists (Settings → Data) for backups and disaster recovery.
Import is destructive (replaces all of the signed-in account's data) — any change to that flow
must keep its safeguards (password re-authentication, explicit typed confirmation, clear warning
copy) intact rather than streamlining them away. See DIST.md → "Supabase setup" for the one-time
project configuration this depends on.

## AI-Assisted Development

When modifying code:

- Read `SPECS.md` first.
- Inspect existing implementations before creating new abstractions.
- Avoid unrelated refactors.
- Prefer simple, maintainable solutions.
- Run relevant type checks and tests.
- Add comments to materially changed code when the reason is not obvious.

Do not generate large speculative implementations.

## Testing

Test business logic independently from the UI.

At minimum, cover calculations, rounding, validation, numbering, ordering, duplication, persistence, and historical-data isolation.

Document rendering must be tested with multi-page documents, long descriptions, tables, headers/footers, and final-page content.

## Definition of Done

A change is complete when it:

- follows `SPECS.md`;
- fits the existing architecture;
- passes relevant tests and type checks;
- preserves data integrity;
- handles important error cases;
- does not break unrelated functionality.

**Core principle:**

```text
Structured business data
        +
Presentation template
        ↓
Deterministic document renderer
        ↓
Professional PDF
```

## Extra stuff

When finishing, always take a look at the `README.md` file to check that everything is explain correctly.

The `README.md` file should contain relevant information, not the latest change that has been made. It should contain instructions on installation and testing, a brief description and some screenshots with the most relevant things.
