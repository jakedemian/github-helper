---
name: deploy
description: Push the latest build of the extension to the Chrome Web Store and Firefox Add-ons. Use when the user says "deploy", "push this up", "release", "ship it", or "submit the latest build". Handles the version bump, upload, verification, and the git commit for the bump.
---

# Deploy to both stores

Everything runs through `scripts/release.mjs`, which reads secrets from the
gitignored `.env` at the repo root. Never print `.env` values, and never paste
tokens into chat.

## Arguments

`$ARGUMENTS` may contain:

- `patch` (default), `minor`, or `major`: the version bump.
- `publish`: also submit the Chrome draft for review. Without it the Chrome
  upload stays a draft. Firefox has no draft state and always enters review.
- `chrome` or `firefox`: limit to one store.

## Steps

1. Confirm the working tree is clean with `git status --short`. If it isn't,
   stop and ask whether to commit first. A deploy must correspond to a commit.
2. Confirm `.env` has the keys the run needs. Chrome needs
   `CHROME_EXTENSION_ID`, `CHROME_CLIENT_ID`, `CHROME_CLIENT_SECRET`,
   `CHROME_REFRESH_TOKEN`. Firefox needs `AMO_JWT_ISSUER`, `AMO_JWT_SECRET`.
   Check with `grep -c` on the key names, not by printing the file.
3. Run the release. Prefix with the pid echo required by the global shell rule:

   ```
   echo "pid=$$ deploy extension to stores" && node scripts/release.mjs --bump <patch|minor|major> [--publish] [--chrome-only|--firefox-only]
   ```

   This bumps `manifest.json` and `package.json`, builds
   `dist/github-helper-<version>.zip`, uploads to Chrome, and creates a
   Firefox version.
4. If either store rejects the package, fix the cause, and if the version was
   already consumed by the other store, re-run with `--version <same version>`
   and the `--<store>-only` flag rather than bumping again.
5. Commit the version bump and push:

   ```
   git add manifest.json package.json && git commit -m "Release <version>" && git push
   ```

   Keep the commit message under 50 characters.
6. Verify. Chrome: query the draft with the Web Store API and confirm
   `crxVersion` matches. Firefox: query
   `https://addons.mozilla.org/api/v5/addons/addon/github-helper@jakedemian.dev/versions/`
   with a JWT built from the AMO keys and confirm the new version is listed
   with `file_status` `unreviewed`. The JWT construction is in
   `scripts/release.mjs` (`amoJwt`).

## Report

State the version, what each store received (Chrome draft or submitted for
review, Firefox in review queue), the commit hash, and anything that was
skipped or failed. Link the dashboards:

- Chrome: `https://chrome.google.com/webstore/devconsole/5bc888c7-f6c1-4cb5-aef8-d35e62ea99fc/lmffflgeegkpakflabcbfpnajkcmefaa/edit`
- Firefox: `https://addons.mozilla.org/en-US/developers/addon/github-helper1/edit`

## Gotchas

- A version can only be uploaded once per store. Never re-upload the same
  version to a store that already has it.
- Chrome rejects uploads while a previous submission is pending review. Wait
  for that review or cancel it in the dashboard first.
- The Chrome refresh token is permanent as long as the OAuth consent screen in
  Google Cloud project `github-helper-extension` stays published. If token
  refresh starts failing, that is the first thing to check.
