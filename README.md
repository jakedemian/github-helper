# GitHub Helper

A browser extension (Chrome, Chromium, Firefox) with a grab bag of small
quality-of-life tweaks for github.com.

## Features

- **My Open PRs**: on a repo's pull request list (`/owner/repo/pulls`), adds a
  "My Open PRs" button next to "New pull request" that filters the list to
  `is:pr state:open author:@me`.

## Local install

No build step. Load the repo folder directly.

### Chrome / Chromium

1. Open `chrome://extensions`.
2. Turn on "Developer mode" (top right).
3. Click "Load unpacked" and pick this repo's root folder (the one containing
   `manifest.json`).
4. After editing code, click the reload icon on the extension card and refresh
   any open github.com tabs.

### Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Click "Load Temporary Add-on..." and pick `manifest.json` in this folder.
3. After editing code, click "Reload" on the extension entry and refresh any
   open github.com tabs.

Temporary add-ons are removed when Firefox closes. Repeat step 2 on the next
launch.

## Layout

- `manifest.json`: extension manifest (Manifest V3, shared by both browsers).
- `src/main.js`: entry point. Runs every registered feature on page load, on
  GitHub's turbo navigation, and on dom changes.
- `src/features/*.js`: one file per feature. Each pushes `{ name, run }` onto
  `window.__ghHelperFeatures`. `run` must be idempotent.

## Adding a feature

1. Create `src/features/<name>.js` following the pattern in
   `my-open-prs.js`.
2. Add the file to the `js` array in `manifest.json` before `src/main.js`.

## Releasing

`scripts/release.mjs` bumps the version, builds `dist/github-helper-<version>.zip`,
uploads it to the Chrome Web Store, and submits it to Firefox Add-ons (AMO).

```
npm run zip                                  # build the zip only
node scripts/release.mjs --bump patch        # upload to chrome as draft + submit to amo
node scripts/release.mjs --bump minor --publish   # also submit the chrome draft for review
node scripts/release.mjs --version 1.2.3 --chrome-only
```

Flags: `--bump patch|minor|major`, `--version x.y.z`, `--publish`, `--chrome-only`,
`--firefox-only`, `--dry-run`.

Secrets live in a gitignored `.env` at the repo root:

```
CHROME_EXTENSION_ID=
CHROME_CLIENT_ID=
CHROME_CLIENT_SECRET=
CHROME_REFRESH_TOKEN=
AMO_JWT_ISSUER=
AMO_JWT_SECRET=
```

The Chrome values come from a Google Cloud project with the Chrome Web Store API
enabled and a Desktop OAuth client. The refresh token is obtained once through the
OAuth consent flow with the `https://www.googleapis.com/auth/chromewebstore` scope.
If the OAuth consent screen is left in "Testing", the refresh token expires every
7 days; publish the consent screen to production to make it permanent. The AMO
values come from https://addons.mozilla.org/developers/addon/api/key/.

A store that is missing its keys is skipped with a warning. Store listing text,
screenshots, and privacy answers are managed in each store's dashboard, not here.
