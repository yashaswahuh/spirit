import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import AdmZip from 'adm-zip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const distOtaDir = path.join(rootDir, 'dist-ota');

const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8'));
const version = pkg.version || '1.0.1';
const build = pkg.build || 1001;

console.log(`\n=== Packaging Spirit OTA Bundle v${version} (Build ${build}) ===`);

// 1. Build mobile-specific web bundle with base="/" into dist-ota
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

// 2. Create dist-ota.zip containing all files in dist-ota/
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
const zipSizeKb = (fs.statSync(zipPath).size / 1024).toFixed(1);
console.log(`Created OTA zip archive: ${zipPath} (${zipSizeKb} KB)`);

// 3. Generate version.json manifest in dist/
const manifest = {
  version,
  build,
  bundleUrl: 'https://yashaswahuh.is-a.dev/spirit/dist-ota.zip',
  fallbackBundleUrl: 'https://yashaswahuh.github.io/spirit/dist-ota.zip',
  releaseNotes: `Spirit v${version} - Official Release with live OTA auto-updates, PDF attendance reports, and native storage integration.`,
  updatedAt: new Date().toISOString(),
};

const manifestPath = path.join(distDir, 'version.json');
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
console.log(`Generated OTA version manifest: ${manifestPath}`);

// 4. Clean up temporary dist-ota directory
try {
  fs.rmSync(distOtaDir, { recursive: true, force: true });
  console.log('Cleaned up temporary dist-ota build artifacts.');
} catch (e) {
  // ignore cleanup errors
}

console.log('=== OTA package generation complete ===\n');

