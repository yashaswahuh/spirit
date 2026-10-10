import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import AdmZip from 'adm-zip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const distOtaDir = path.join(rootDir, 'dist-ota');
const pkgPath = path.join(rootDir, 'package.json');
const versionFilePath = path.join(rootDir, 'src', 'version.ts');

function bumpPatchVersion(semver) {
  const parts = semver.split('.').map(n => parseInt(n, 10) || 0);
  while (parts.length < 3) parts.push(0);
  parts[2] += 1;
  return parts.join('.');
}

// Parse command-line arguments
const args = process.argv.slice(2);
let explicitVersion = null;
let explicitAppVersion = null;
let noBump = false;

for (const arg of args) {
  if (arg.startsWith('--version=')) {
    explicitVersion = arg.split('=')[1].trim();
  } else if (arg.startsWith('--site-version=')) {
    explicitVersion = arg.split('=')[1].trim();
  } else if (arg.startsWith('--app-version=')) {
    explicitAppVersion = arg.split('=')[1].trim();
  } else if (arg === '--no-bump') {
    noBump = true;
  }
}

// 1. Read existing configuration
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
let appVersion = explicitAppVersion || pkg.version || '1.0.1';
let currentSiteVersion = pkg.siteVersion || pkg.version || '1.0.1';
let currentBuild = pkg.build || 1001;

let newSiteVersion = currentSiteVersion;
let newBuild = currentBuild;

if (explicitVersion) {
  newSiteVersion = explicitVersion;
  newBuild = currentBuild + 1;
} else if (!noBump) {
  // Every dist-ota update is +0.0.1 unless specifically overridden
  newSiteVersion = bumpPatchVersion(currentSiteVersion);
  newBuild = currentBuild + 1;
}

console.log(`\n=== Packaging Spirit OTA Bundle ===`);
console.log(`Native App (APK) Version: v${appVersion} (unchanged)`);
console.log(`Site / Web OTA Version:   v${newSiteVersion} (previous: v${currentSiteVersion})`);
console.log(`Build Number:             ${newBuild}`);

// 2. Synchronize package.json and src/version.ts BEFORE building bundle
pkg.version = appVersion;
pkg.siteVersion = newSiteVersion;
pkg.build = newBuild;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');

const versionTsContent = `/**
 * Spirit Application Version Information
 * - CURRENT_APP_VERSION: The native Android APK binary version.
 *   Remains unchanged until the native Android APK itself is rebuilt and updated.
 * - CURRENT_SITE_VERSION: The web / site / live OTA bundle version.
 *   Increments by +0.0.1 on every dist-ota update unless specifically overridden.
 * - CURRENT_BUILD_NUMBER: Incremental build sequence number.
 */
export const CURRENT_APP_VERSION = '${appVersion}';
export const CURRENT_SITE_VERSION = '${newSiteVersion}';
export const CURRENT_BUILD_NUMBER = ${newBuild};
`;
fs.writeFileSync(versionFilePath, versionTsContent, 'utf-8');
console.log(`Updated version configuration in src/version.ts and package.json.`);

// 3. Build mobile-specific web bundle with base="/" into dist-ota
console.log('Compiling mobile OTA bundle with base="/" ...');
execSync('npx vite build --base=/ --outDir=dist-ota', {
  cwd: rootDir,
  stdio: 'inherit',
  env: { ...process.env, VITE_BASE_PATH: '/' },
});

if (!fs.existsSync(distOtaDir)) {
  console.error('Error: dist-ota directory was not generated.');
  process.exit(1);
}

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// 4. Create dist-ota.zip containing all files in dist-ota/
console.log('Archiving dist-ota bundle into dist/dist-ota.zip ...');
const zip = new AdmZip();
const files = fs.readdirSync(distOtaDir);

for (const file of files) {
  const filePath = path.join(distOtaDir, file);
  const stat = fs.statSync(filePath);
  if (stat.isDirectory()) {
    zip.addLocalFolder(filePath, file);
  } else {
    zip.addLocalFile(filePath);
  }
}

const zipPath = path.join(distDir, 'dist-ota.zip');
zip.writeZip(zipPath);
const zipBuffer = fs.readFileSync(zipPath);
const checksum = crypto.createHash('sha256').update(zipBuffer).digest('hex');
const zipSizeKb = (fs.statSync(zipPath).size / 1024).toFixed(1);
console.log(`Created OTA zip archive: ${zipPath} (${zipSizeKb} KB)`);
console.log(`Bundle SHA-256 Checksum: ${checksum}`);

// 5. Generate version.json manifest in dist/
const manifest = {
  version: newSiteVersion,
  siteVersion: newSiteVersion,
  appVersion: appVersion,
  build: newBuild,
  bundleUrl: 'https://yashaswahuh.is-a.dev/spirit/dist-ota.zip',
  fallbackBundleUrl: 'https://yashaswahuh.github.io/spirit/dist-ota.zip',
  checksum,
  releaseNotes: `Spirit Site v${newSiteVersion} (App v${appVersion}) - Official live OTA release with automated version tracking, PDF attendance reports, and native storage integration.`,
  updatedAt: new Date().toISOString(),
};

const manifestPath = path.join(distDir, 'version.json');
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');
console.log(`Generated OTA version manifest: ${manifestPath}`);

// 6. Clean up temporary dist-ota directory
try {
  fs.rmSync(distOtaDir, { recursive: true, force: true });
  console.log('Cleaned up temporary dist-ota build artifacts.');
} catch (e) {
  // ignore cleanup errors
}

console.log(`=== OTA package generation complete: Site v${newSiteVersion} ===\n`);
