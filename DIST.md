# Distribution & Auto-Updates

This document explains how to turn on **production releases with in-app auto-updates**, and how
to set up the **Supabase backend the app needs to run at all** (accounts and cloud data), for
Presupeitor2000. Everything on the code side is already wired up (see "What's already done"
below in each section); what's left is a handful of one-time steps you need to do on Supabase and
GitHub, because they involve secrets and accounts that can't be set up for you.

The two setups are independent — you need **Supabase setup** for the app to run and sign users in
at all (locally or packaged); **one-time setup** (auto-updates) is only needed once you're ready
to cut signed releases through GitHub Actions.

## Supabase setup

Presupeitor2000 stores every account's data (customers, estimates, the item library, templates,
company profile, settings) in a Supabase Postgres project, behind Supabase Auth (email/password,
with email confirmation and optional TOTP two-factor login). This section is what makes that
actually work — without it, the app can only show its "not configured" screen.

### What's already done (code side)

- **`@supabase/supabase-js`** is the only client dependency — no server of your own to run.
- **`src/lib/supabaseClient.ts`** creates the client from two Vite env vars, `VITE_SUPABASE_URL`
  and `VITE_SUPABASE_ANON_KEY`. Vite inlines `import.meta.env.VITE_*` values into the built
  bundle at **build time** — there is no runtime config file, so these must be set wherever the
  app gets built (your machine for `npm run dev`/`npm run tauri dev`, and GitHub Actions for
  packaged releases — see Step 4 below).
- **`supabase/schema.sql`** is the full Postgres schema (tables + Row Level Security policies) —
  see Step 2.
- **`src/auth/`** (sign in / create account / email confirmation notice / TOTP two-factor
  challenge) and the "Account & security" / "Data" sections of the Settings page
  (`src/pages/SettingsPage.tsx`) — 2FA enrollment and full account data export/import.
- Every repository client in `src/db/` reads/writes Supabase instead of `localStorage` now, all
  scoped to the signed-in user via the RLS policies in `supabase/schema.sql` — not just app-level
  filtering, so one account's data is genuinely inaccessible to another even if app code had a bug.

### Step 1 — Create a Supabase project

1. Go to [supabase.com](https://supabase.com), sign in, and create a new project (any name/region;
   remember the database password it asks you to set, though the app itself never uses it
   directly).
2. Once it's provisioned, go to **Project Settings → API**. You'll need two values from there in
   Step 3: the **Project URL** and the **anon / public key** (not the `service_role` key — that
   one must never be shipped in the app).

### Step 2 — Create the database schema

1. In the Supabase dashboard, open **SQL Editor → New query**.
2. Paste the entire contents of [`supabase/schema.sql`](./supabase/schema.sql) and run it.
3. This creates every table the app needs, enables Row Level Security on all of them, and adds
   the `user_id = auth.uid()` policies that keep each account's data private. It's safe to re-run
   — the whole file is idempotent (`create table if not exists`, policies dropped and recreated).

### Step 3 — Configure Auth

1. **Email confirmation**: In **Authentication → Sign In / Providers → Email**, "Confirm email"
   is on by default for new projects — leave it on. New accounts get a confirmation email
   (`auth.signUp()` returns no session until it's clicked — that's what
   `src/auth/AuthGate.tsx` shows the "check your email" screen for).
2. **Site URL**: In **Authentication → URL Configuration**, set a **Site URL** — this is where
   the confirmation email's link points. Presupeitor2000 is a desktop app with no hosted web
   page of its own, so there's nothing meaningful to deep-link back into; set it to any stable
   URL you control (e.g. this repo's GitHub Pages/README, or just
   `https://github.com/Reivaxmar/Budget-app-2`). The confirmation link's only job is to mark the
   account verified — the user closes that tab afterwards and signs in from the app normally, no
   redirect handling required.
3. **Two-factor (TOTP)**: no extra project configuration is needed — `supabase.auth.mfa.*` (used
   by `src/auth/mfa.ts`) is available by default. Enabling it is entirely per-user, opt-in, from
   Settings → "Account & security" inside the app.
4. Leave **email/password** as the sign-in method; no OAuth provider is wired up in the app code
   at this time.

### Step 4 — Provide the env vars everywhere the app gets built

| Where | How |
| --- | --- |
| Local development (`npm run dev`, `npm run tauri dev`) | Copy [`.env.example`](./.env.example) to `.env.local` (git-ignored) and fill in the two values from Step 1. |
| GitHub Actions (`npm run build` inside CI, e.g. the release workflow) | In the GitHub repo, go to **Settings → Secrets and variables → Actions → New repository secret** and add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. `.github/workflows/release.yml` already passes both through to `tauri-apps/tauri-action`, which runs the frontend build as part of packaging. |

Both values are safe to expose in a shipped build or a public repo's Actions logs — the anon key
only grants what the RLS policies in `supabase/schema.sql` allow, never a service-role bypass. Do
**not** ever put the `service_role` key in the app, an env var read by the frontend, or a GitHub
secret used by this workflow.

### Step 5 — Verify it end-to-end

1. Run `npm run dev` (or `npm run tauri dev`) with `.env.local` in place.
2. You should land on the sign-in/create-account screen (`src/auth/AuthGate.tsx`) instead of the
   "not configured" message.
3. Create an account, confirm the email, sign in, and check that Settings → "Account & security"
   lets you enroll a TOTP authenticator and that signing out and back in then asks for the code.
4. Add a customer or estimate, then check the corresponding table in the Supabase dashboard's
   **Table Editor** to confirm it's actually landing in Postgres.

### Notes and limitations

- There is currently no "forgot password" flow wired up in the app UI — `supabase.auth.resetPasswordForEmail`
  is not called anywhere yet. A locked-out user would need a manual reset from the Supabase
  dashboard until that's added.
- Import (Settings → Data → "Import data") is destructive by design — it deletes and replaces
  everything in the signed-in account. It's gated behind re-entering the account password (checked
  against Supabase, not just client-side) plus typing a literal confirmation phrase in the UI. Make
  sure anyone with access to that screen understands what it does.
- A machine that already has data from the pre-Supabase, local-only version of this app (plain
  `localStorage`) is offered a one-time export of that data right after first sign-in
  (`src/components/LocalBackupNotice.tsx`) — it is never migrated into the Supabase account
  automatically, since it isn't tied to any account.

## Auto-Updates

The rest of this document explains how to turn on **production releases with in-app
auto-updates**. Everything on the code side is already wired up (see "What's already done"
below); what's left is a handful of one-time steps you need to do on GitHub and on your own
machine, because they involve secrets and accounts that can't be set up for you.

**Nothing here is configured with fake or placeholder credentials that pretend to work.** The
signing public key in `src-tauri/tauri.conf.json` is a literal placeholder
(`REPLACE_WITH_YOUR_GENERATED_PUBLIC_KEY`) and the GitHub Actions workflow will fail until you
add real secrets, by design — that's safer than shipping something that looks configured but
silently can't verify updates.

### What's already done (code side)

- **`tauri-plugin-updater`** and **`tauri-plugin-process`** are added as dependencies
  (`src-tauri/Cargo.toml`) and registered (`src-tauri/src/lib.rs`).
- **Capabilities** (`src-tauri/capabilities/default.json`) grant `updater:default` and
  `process:default`, the permissions the frontend needs to call the updater and to relaunch the
  app.
- **`src-tauri/tauri.conf.json`**:
  - `bundle.createUpdaterArtifacts: true` — makes the build produce the signed update
    bundles/`.sig` files the updater needs, alongside the normal installers.
  - `plugins.updater.endpoints` points at
    `https://github.com/Reivaxmar/Budget-app-2/releases/latest/download/latest.json` — the
    standard "static JSON on GitHub Releases" update source. GitHub Releases hosts the file for
    free; there's no separate update server to run or pay for.
  - `plugins.updater.pubkey` is the placeholder you'll replace in Step 2 below.
- **Frontend UI** (`src/components/UpdateDialog.tsx`): on startup, silently checks for an
  update. If one exists, it shows a dialog with the new version number and an "Update" /
  "Later" choice. Clicking "Update" downloads, installs, and relaunches the app. This component
  does nothing (no errors, no dialog) when the app isn't running inside the packaged Tauri
  binary — so `npm run dev` in a browser is unaffected.
- **`.github/workflows/release.yml`**: builds the app for Windows, macOS (Intel + Apple
  Silicon) and Linux, signs the update artifacts, and publishes them to a GitHub Release
  together with `latest.json`. It runs when you push a tag matching `v*.*.*`.

None of this can produce a working update until you complete the steps below.

### One-time setup

### Step 1 — Generate a signing keypair

Tauri's updater only installs updates whose signature it can verify against a public key baked
into the app. You generate this keypair once, keep the private half secret, and never need to
change it for future releases (only the version number changes per release).

From the project root:

```bash
npm run tauri signer generate -- -w ~/.tauri/presupeitor2000.key
```

This prompts you to set a password for the private key, then prints something like:

```
Your keypair was generated successfully
Private: ~/.tauri/presupeitor2000.key (Keep it secret!)
Public: ~/.tauri/presupeitor2000.key.pub
```

Keep the private key file and its password somewhere safe (a password manager). **Do not commit
the private key to the repository.**

### Step 2 — Put the public key in the app config

Open `~/.tauri/presupeitor2000.key.pub`, copy its contents, and paste them into
`src-tauri/tauri.conf.json`, replacing the placeholder:

```json
"plugins": {
  "updater": {
    "pubkey": "PASTE_THE_CONTENTS_OF_presupeitor2000.key.pub_HERE",
    ...
```

The **public** key is not a secret — it's meant to ship inside the app binary, so it's fine (and
necessary) to commit this change.

### Step 3 — Add the private key as GitHub secrets

The release workflow needs the private key (and its password) to sign builds in CI, without
ever exposing them in logs or to anyone browsing the repo.

In the GitHub repo, go to **Settings → Secrets and variables → Actions → New repository
secret** and add two secrets:

| Secret name | Value |
| --- | --- |
| `TAURI_SIGNING_PRIVATE_KEY` | The **entire contents** of `~/.tauri/presupeitor2000.key` (the private key file, not the `.pub` one) |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | The password you set in Step 1 |

### Step 4 — Check Actions permissions

The workflow needs permission to create releases using the automatic `GITHUB_TOKEN`. This is
usually on by default for a new repo, but if release creation fails with a permissions error,
go to **Settings → Actions → General → Workflow permissions** and select **"Read and write
permissions"**.

### Step 5 — Bump the version before every release

The updater compares the app's configured version against the version published in
`latest.json` — **not** against the git tag name. Before cutting a release, update the
`version` field in `src-tauri/tauri.conf.json` (and, for consistency, `package.json`) to the
new version, commit that change, then tag and push:

```bash
# after editing "version" in src-tauri/tauri.conf.json (and package.json)
git add src-tauri/tauri.conf.json package.json
git commit -m "Bump version to 0.2.0"
git tag v0.2.0
git push origin main --tags
```

Pushing a tag matching `v*.*.*` triggers `.github/workflows/release.yml`.

### Step 6 — Publish the draft release

The workflow creates the GitHub Release as a **draft** on purpose (`releaseDraft: true` in
`release.yml`) — this gives you a chance to check the build artifacts before anyone (including
the updater) can see them. GitHub's "latest release" (what the updater endpoint reads) never
includes drafts.

Once the Action finishes:

1. Go to the repo's **Releases** page.
2. Open the new draft release and confirm the installers and `latest.json`/`.sig` files are
   attached for each platform.
3. Click **"Publish release"**.

Only after publishing will `https://github.com/Reivaxmar/Budget-app-2/releases/latest/download/latest.json`
resolve, and existing installs will be able to see the update.

If you'd rather skip manual review and publish immediately, change `releaseDraft: true` to
`releaseDraft: false` in `release.yml` — not recommended until you've done at least one release
end-to-end.

### Step 7 — Test the whole flow

1. Do a first release (Steps 5–6) and install the built app on a machine.
2. Bump the version again (Step 5), tag, push, and publish the new draft release (Step 6).
3. Open the already-installed (older) app. Within a few seconds it should show the "Update
   available" dialog with the new version number. Click "Update" and confirm it downloads,
   installs, and relaunches into the new version.

### Notes and known limitations

- **This repo must stay public** (or the CI token/anyone checking for updates needs read access
  to it) for the anonymous `releases/latest/download/latest.json` URL to work without
  authentication.
- **macOS code signing/notarization** is not set up here — `tauri-action` will still produce a
  macOS build, but unsigned/unnotarized apps show Gatekeeper warnings on first launch. That's a
  separate, optional piece of setup (an Apple Developer account, certificates, and additional
  secrets) not covered by this document.
- If you ever rename the GitHub repo or move it to a different owner, update the endpoint URL
  in `src-tauri/tauri.conf.json` (`plugins.updater.endpoints`) and the `identifier` used
  throughout `src-tauri/tauri.conf.json` accordingly.
- If a signature check ever fails after publishing, the most common cause is the `pubkey` in
  `tauri.conf.json` not matching the private key actually used to sign that build — regenerate
  Step 2 from the correct `.pub` file and re-release.
