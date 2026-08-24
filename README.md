# Presupeitor2000

A desktop-first application for building professional construction estimates: manage customers,
a reusable item library, document templates and your company profile, then compose an estimate
from chapters and line items and export it as a paginated PDF. See [`SPECS.md`](./SPECS.md) for
the full product specification and [`AGENTS.md`](./AGENTS.md) for engineering conventions.

Built with Tauri, React, TypeScript and Vite. Document rendering is handled by
[`@react-pdf/renderer`](https://react-pdf.org/), driven by structured estimate data and a
template configuration rather than hard-coded page layouts. Accounts and data storage are
handled by [Supabase](https://supabase.com) (Postgres + Auth) — see [`DIST.md`](./DIST.md) →
"Supabase setup" for the one-time project setup this requires.

## Status

This is an early-stage build. Customers, the item library, templates, company profile, the
estimate editor (chapters, line items, PDF export), a dashboard overview and app settings
(theme, default tax rate) are implemented. Every user signs in (email/password, with email
confirmation and optional TOTP two-factor login) and all data is stored per-account in Supabase
Postgres, scoped by Row Level Security — there is no offline/local-only mode. A full account data
export/import is available from Settings → Data.

## Getting started

Install dependencies:

```bash
npm install
```

Set up a Supabase project and provide its URL/anon key (see [`DIST.md`](./DIST.md) →
"Supabase setup" for the full walkthrough, including the SQL schema to run):

```bash
cp .env.example .env.local
# then fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local
```

Run the app in the browser (Vite dev server):

```bash
npm run dev
```

Run it as a native desktop app via Tauri (requires the Rust toolchain — see the
[Tauri prerequisites](https://tauri.app/start/prerequisites/)):

```bash
npm run tauri dev
```

## Testing

```bash
npm test               # run tests in watch mode (vitest)
npx vitest run          # run the full suite once (used in CI)
npm run test:ui        # run tests with the Vitest UI
npm run type-check     # TypeScript, no emit
npm run lint           # ESLint
```

Tests cover business logic independently from the UI: estimate numbering/duplication/totals
(`src/services/estimateService.test.ts`), the item library and template services, repository
persistence, and document rendering — including multi-page documents, long descriptions and
custom template configurations (`src/rendering/EstimateDocument.render.test.tsx`).

## Project structure

```
src/
  domain/      # Entity types and pure calculations (no I/O)
  db/          # Repository clients (persistence, backed by Supabase Postgres)
  lib/         # Supabase client setup
  auth/        # Sign in / create account / TOTP two-factor UI and context
  services/    # Application logic: numbering, totals, validation, PDF export, backup/restore
  rendering/   # Structured-data + template -> PDF (react-pdf)
  pages/       # React screens
  i18n/        # i18next setup and translation resources
```

## Internationalization

The app UI (menus, page titles, buttons, form labels, validation/error messages) is wired
through [i18next](https://www.i18next.com/)/[react-i18next](https://react.i18next.com/) via
`useTranslation()`/`t(...)` rather than hard-coded strings — see `src/i18n/index.ts` and
`src/i18n/locales/en.json`. Only English exists today; adding a real second language later is:

1. add `src/i18n/locales/<lng>.json` with the same keys as `en.json`;
2. register it in the `resources` object in `src/i18n/index.ts`;
3. add a language switcher that calls `i18n.changeLanguage(<lng>)`.

No component changes are required. Generated PDF documents (cover, tables, final page) are
driven by the Template system's own configurable wording, not by this UI translation layer.

## Screenshots

Not included yet — add screenshots of the Estimate Editor and an exported PDF here once the UI
is more visually settled.

## Building

```bash
npm run build          # frontend production build
npm run tauri build    # packaged desktop application
```

## Auto-updates

Packaged builds check for updates on startup via `tauri-plugin-updater` (signed update
artifacts, GitHub Releases as the update source) and offer to install/relaunch via
`tauri-plugin-process` — see `src/components/UpdateDialog.tsx`. This is disabled/inert when
running in a browser (`npm run dev`). Publishing a signed release requires a one-time setup
(signing keys, GitHub secrets); see [`DIST.md`](./DIST.md) for the full walkthrough.
