#!/usr/bin/env node
// builds the extension zip and pushes it to the chrome web store and firefox amo.
//
//   node scripts/release.mjs [--bump patch|minor|major | --version x.y.z]
//                            [--publish] [--chrome-only | --firefox-only] [--dry-run]
//
// secrets come from .env at the repo root (see readme). without --publish the
// chrome upload lands as a draft; firefox submissions always go to review.

import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
};

// ---------------------------------------------------------------- env
const env = { ...process.env };
const envPath = join(root, '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) env[m[1]] = m[2];
  }
}
const need = (keys) => keys.every((k) => env[k]);
const chromeReady = need(['CHROME_EXTENSION_ID', 'CHROME_CLIENT_ID', 'CHROME_CLIENT_SECRET', 'CHROME_REFRESH_TOKEN']);
const firefoxReady = need(['AMO_JWT_ISSUER', 'AMO_JWT_SECRET']);

// ---------------------------------------------------------------- version
const manifestPath = join(root, 'manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const bump = opt('--bump');
const explicit = opt('--version');
if (bump || explicit) {
  let [major, minor, patch] = manifest.version.split('.').map(Number);
  if (explicit) {
    manifest.version = explicit;
  } else {
    if (bump === 'major') [major, minor, patch] = [major + 1, 0, 0];
    else if (bump === 'minor') [minor, patch] = [minor + 1, 0];
    else if (bump === 'patch') patch += 1;
    else throw new Error(`unknown bump "${bump}"`);
    manifest.version = `${major}.${minor}.${patch}`;
  }
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  // keep package.json in step so the two never disagree
  const pkgPath = join(root, 'package.json');
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    pkg.version = manifest.version;
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  }
}
const version = manifest.version;
console.log(`version ${version}`);

// ---------------------------------------------------------------- stage + zip
const dist = join(root, 'dist');
const stage = join(dist, 'stage');
rmSync(stage, { recursive: true, force: true });
mkdirSync(stage, { recursive: true });
cpSync(manifestPath, join(stage, 'manifest.json'));
cpSync(join(root, 'src'), join(stage, 'src'), { recursive: true });
cpSync(join(root, 'icons'), join(stage, 'icons'), {
  recursive: true,
  filter: (src) => !src.endsWith('source.png'),
});
const zipPath = join(dist, `github-helper-${version}.zip`);
rmSync(zipPath, { force: true });
execFileSync('zip', ['-qr', zipPath, '.'], { cwd: stage, stdio: 'inherit' });
console.log(`built ${zipPath}`);

if (flag('--dry-run')) process.exit(0);

// ---------------------------------------------------------------- chrome
async function pushChrome() {
  if (!chromeReady) {
    console.log('chrome: skipped, missing CHROME_* keys in .env');
    return;
  }
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.CHROME_CLIENT_ID,
      client_secret: env.CHROME_CLIENT_SECRET,
      refresh_token: env.CHROME_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  const token = await tokenRes.json();
  if (!token.access_token) throw new Error(`chrome token error: ${JSON.stringify(token)}`);
  const headers = { authorization: `Bearer ${token.access_token}`, 'x-goog-api-version': '2' };
  const id = env.CHROME_EXTENSION_ID;

  const upload = await fetch(`https://www.googleapis.com/upload/chromewebstore/v1.1/items/${id}`, {
    method: 'PUT',
    headers,
    body: readFileSync(zipPath),
  });
  const uploadBody = await upload.json();
  if (uploadBody.uploadState !== 'SUCCESS') {
    throw new Error(`chrome upload failed: ${JSON.stringify(uploadBody)}`);
  }
  console.log(`chrome: uploaded ${version} as draft`);

  if (flag('--publish')) {
    const pub = await fetch(`https://www.googleapis.com/chromewebstore/v1.1/items/${id}/publish`, {
      method: 'POST',
      headers,
    });
    const pubBody = await pub.json();
    console.log(`chrome: publish -> ${JSON.stringify(pubBody.status ?? pubBody)}`);
  }
}

// ---------------------------------------------------------------- firefox
function pushFirefox() {
  if (!firefoxReady) {
    console.log('firefox: skipped, missing AMO_* keys in .env');
    return;
  }
  execFileSync(
    'npx',
    [
      '--yes', 'web-ext@10', 'sign',
      '--source-dir', stage,
      '--artifacts-dir', join(dist, 'firefox'),
      '--channel', 'listed',
      '--api-key', env.AMO_JWT_ISSUER,
      '--api-secret', env.AMO_JWT_SECRET,
      '--no-config-discovery',
    ],
    { stdio: 'inherit' },
  );
  console.log(`firefox: submitted ${version} for review`);
}

const only = flag('--chrome-only') ? 'chrome' : flag('--firefox-only') ? 'firefox' : null;
if (only !== 'firefox') await pushChrome();
if (only !== 'chrome') pushFirefox();
