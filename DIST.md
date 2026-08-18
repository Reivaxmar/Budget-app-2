# Distribution & Auto-Updates

This document explains how to turn on **production releases with in-app auto-updates** for
Presupeitor2000. Everything on the code side is already wired up (see "What's already done"
below); what's left is a handful of one-time steps you need to do on GitHub and on your own
machine, because they involve secrets and accounts that can't be set up for you.

**Nothing here is configured with fake or placeholder credentials that pretend to work.** The
signing public key in `src-tauri/tauri.conf.json` is a literal placeholder
(`REPLACE_WITH_YOUR_GENERATED_PUBLIC_KEY`) and the GitHub Actions workflow will fail until you
add real secrets, by design — that's safer than shipping something that looks configured but
silently can't verify updates.

## What's already done (code side)

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

## One-time setup

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

## Notes and known limitations

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
