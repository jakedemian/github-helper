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
