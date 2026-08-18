# Construction Estimate & Quote Management Application

A desktop-first application for building professional construction estimates: manage customers,
a reusable item library, document templates and your company profile, then compose an estimate
from chapters and line items and export it as a paginated PDF. See [`SPECS.md`](./SPECS.md) for
the full product specification and [`AGENTS.md`](./AGENTS.md) for engineering conventions.

Built with Tauri, React, TypeScript and Vite. Document rendering is handled by
[`@react-pdf/renderer`](https://react-pdf.org/), driven by structured estimate data and a
template configuration rather than hard-coded page layouts.

## Status

This is an early-stage build. Customers, the item library, templates, company profile and the
estimate editor (chapters, line items, PDF export) are implemented and persisted to local
storage. The Dashboard and Settings screens are still placeholders, and persistence currently
uses the browser's `localStorage` rather than the SQLite/Drizzle backend sketched in
`src/db/schema.ts` / `src/db/repository.ts`.

## Getting started

Install dependencies:

```bash
npm install
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
  db/          # Repository clients (persistence)
  services/    # Application logic: numbering, totals, validation, PDF export
  rendering/   # Structured-data + template -> PDF (react-pdf)
  pages/       # React screens
```

## Screenshots

Not included yet — add screenshots of the Estimate Editor and an exported PDF here once the UI
is more visually settled.

## Building

```bash
npm run build          # frontend production build
npm run tauri build    # packaged desktop application
```
