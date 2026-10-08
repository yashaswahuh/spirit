import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// CRC32 implementation
function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ -1) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcVal = Buffer.alloc(4);
  crcVal.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([len, typeBuf, data, crcVal]);
}

function pointInPoly(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    const intersect = ((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function cubicBezier(p0, p1, p2, p3, steps = 12) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    const x = u*u*u*p0[0] + 3*u*u*t*p1[0] + 3*u*t*t*p2[0] + t*t*t*p3[0];
    const y = u*u*u*p0[1] + 3*u*u*t*p1[1] + 3*u*t*t*p2[1] + t*t*t*p3[1];
    pts.push([x, y]);
  }
  return pts;
}

// 512x512 Spirit geometry
const diamondPoly = [
  [256, 120],
  [400, 200],
  [256, 280],
  [112, 200]
];

const capCurve = cubicBezier([160, 330], [160, 370], [352, 370], [352, 330], 12);
const skullcapPoly = [
  [160, 236],
  [160, 330],
  ...capCurve,
  [352, 330],
  [352, 236],
  [256, 288]
];

/**
 * Generates PNG buffer for an icon or splash screen
 * mode: 'launcher' | 'round' | 'foreground' | 'splash'
 */
function renderSpiritPng(width, height, mode = 'launcher') {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8);
  ihdr.writeUInt8(6, 9); // RGBA
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);
  const ihdrChunk = makeChunk('IHDR', ihdr);

  const rowSize = width * 4;
  const raw = Buffer.alloc(height * (rowSize + 1));

  const cx = width / 2;
  const cy = height / 2;

  // Scale and center for emblem
  let emblemScale;
  let emblemCenterY = cy;

  if (mode === 'foreground') {
    emblemScale = (width * 0.58) / 512;
  } else if (mode === 'splash') {
    const minDim = Math.min(width, height);
    emblemScale = Math.min(minDim * 0.40, 280) / 512;
    emblemCenterY = cy - minDim * 0.02;
  } else {
    // launcher / round
    emblemScale = (width * 0.72) / 512;
  }

  // Supersampling grid for crisp smooth edges (2x2 subpixels)
  const subOffsets = [-0.25, 0.25];

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (rowSize + 1);
    raw[rowOffset] = 0; // Filter None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;

      let totalR = 0, totalG = 0, totalB = 0, totalA = 0;

      for (let sy = 0; sy < 2; sy++) {
        for (let sx = 0; sx < 2; sx++) {
          const subX = x + 0.5 + subOffsets[sx];
          const subY = y + 0.5 + subOffsets[sy];

          const dx = subX - cx;
          const dy = subY - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);

          let r = 0, g = 0, b = 0, a = 0;

          if (mode === 'foreground') {
            // Background is completely transparent
            a = 0;
          } else if (mode === 'round') {
            const radius = width * 0.48;
            if (dist <= radius) {
              // Deep Indigo gradient #4338ca to #4f46e5
              const grad = subY / height;
              r = Math.floor(67 + grad * 12);
              g = Math.floor(56 + grad * 14);
              b = Math.floor(202 + grad * 27);
              a = 255;
            }
          } else if (mode === 'launcher') {
            // Squircle / rounded rect: corners radius ~22%
            const cornerR = width * 0.22;
            const qx = Math.max(0, Math.abs(dx) - (width / 2 - cornerR));
            const qy = Math.max(0, Math.abs(dy) - (height / 2 - cornerR));
            const cornerDist = Math.sqrt(qx * qx + qy * qy);
            if (cornerDist <= cornerR) {
              const grad = subY / height;
              r = Math.floor(67 + grad * 12);
              g = Math.floor(56 + grad * 14);
              b = Math.floor(202 + grad * 27);
              a = 255;
            }
          } else if (mode === 'splash') {
            // Full screen solid Spirit Indigo #4F46E5 with subtle vignette
            const grad = subY / height;
            r = Math.floor(79 - grad * 10);
            g = Math.floor(70 - grad * 12);
            b = Math.floor(229 - grad * 20);
            a = 255;
          }

          // Transform point into 512x512 emblem coordinates
          const ex = 256 + (subX - cx) / emblemScale;
          const ey = 256 + (subY - emblemCenterY) / emblemScale;

          // Check emblem parts
          if (ex >= 0 && ex <= 512 && ey >= 0 && ey <= 512) {
            const inDiamond = pointInPoly(ex, ey, diamondPoly);
            const inSkullcap = pointInPoly(ex, ey, skullcapPoly);

            // Tassel line: (370, 215) -> (390, 280) -> (395, 350)
            const dSeg1 = distToSegment(ex, ey, 370, 215, 390, 280);
            const dSeg2 = distToSegment(ex, ey, 390, 280, 395, 350);
            const inTasselLine = Math.min(dSeg1, dSeg2) <= 7;
            const inTasselBead = Math.hypot(ex - 395, ey - 358) <= 12;

            if (inDiamond) {
              // Pure White
              r = 255; g = 255; b = 255; a = 255;
            } else if (inSkullcap) {
              // Soft White #F8FAFC
              r = 248; g = 250; b = 252; a = 255;
            } else if (inTasselLine || inTasselBead) {
              // Amber / Gold #FBBF24
              r = 251; g = 191; b = 36; a = 255;
            }
          }

          totalR += r;
          totalG += g;
          totalB += b;
          totalA += a;
        }
      }

      raw[pxOffset] = Math.round(totalR / 4);
      raw[pxOffset + 1] = Math.round(totalG / 4);
      raw[pxOffset + 2] = Math.round(totalB / 4);
      raw[pxOffset + 3] = Math.round(totalA / 4);
    }
  }

  const compressed = zlib.deflateSync(raw);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

const resDir = path.resolve('android/app/src/main/res');

// Mipmap icons config
const mipmaps = [
  { folder: 'mipmap-mdpi', size: 48, fgSize: 108 },
  { folder: 'mipmap-hdpi', size: 72, fgSize: 162 },
  { folder: 'mipmap-xhdpi', size: 96, fgSize: 216 },
  { folder: 'mipmap-xxhdpi', size: 144, fgSize: 324 },
  { folder: 'mipmap-xxxhdpi', size: 192, fgSize: 432 },
];

console.log('Generating Spirit Android Mipmap Icons...');
for (const m of mipmaps) {
  const dirPath = path.join(resDir, m.folder);
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });

  fs.writeFileSync(path.join(dirPath, 'ic_launcher.png'), renderSpiritPng(m.size, m.size, 'launcher'));
  fs.writeFileSync(path.join(dirPath, 'ic_launcher_round.png'), renderSpiritPng(m.size, m.size, 'round'));
  fs.writeFileSync(path.join(dirPath, 'ic_launcher_foreground.png'), renderSpiritPng(m.fgSize, m.fgSize, 'foreground'));
}

// Splash screens config
const splashScreens = [
  { folder: 'drawable', file: 'splash.png', w: 480, h: 320 },
  { folder: 'drawable-port-mdpi', file: 'splash.png', w: 320, h: 480 },
  { folder: 'drawable-port-hdpi', file: 'splash.png', w: 480, h: 800 },
  { folder: 'drawable-port-xhdpi', file: 'splash.png', w: 720, h: 1280 },
  { folder: 'drawable-port-xxhdpi', file: 'splash.png', w: 960, h: 1600 },
  { folder: 'drawable-port-xxxhdpi', file: 'splash.png', w: 1280, h: 1920 },
  { folder: 'drawable-land-mdpi', file: 'splash.png', w: 480, h: 320 },
  { folder: 'drawable-land-hdpi', file: 'splash.png', w: 800, h: 480 },
  { folder: 'drawable-land-xhdpi', file: 'splash.png', w: 1280, h: 720 },
  { folder: 'drawable-land-xxhdpi', file: 'splash.png', w: 1600, h: 960 },
  { folder: 'drawable-land-xxxhdpi', file: 'splash.png', w: 1920, h: 1280 },
];

console.log('Generating Spirit Android Splash Screens...');
for (const s of splashScreens) {
  const dirPath = path.join(resDir, s.folder);
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
  fs.writeFileSync(path.join(dirPath, s.file), renderSpiritPng(s.w, s.h, 'splash'));
}

// Vector drawable for adaptive icon foreground
const vectorXml = `<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="512"
    android:viewportHeight="512">
    <group
        android:scaleX="0.58"
        android:scaleY="0.58"
        android:pivotX="256"
        android:pivotY="256">
        <!-- Mortarboard Diamond Top -->
        <path
            android:fillColor="#FFFFFF"
            android:pathData="M256,120 L400,200 L256,280 L112,200 Z" />
        <!-- Mortarboard Skullcap Arc -->
        <path
            android:fillColor="#F8FAFC"
            android:pathData="M160,236 L160,330 C160,370 352,370 352,330 L352,236 L256,288 Z" />
        <!-- Amber/Gold Tassel Cord -->
        <path
            android:strokeColor="#FBBF24"
            android:strokeWidth="12"
            android:strokeLineCap="round"
            android:strokeLineJoin="round"
            android:pathData="M370,215 L390,280 L395,350" />
        <!-- Amber/Gold Tassel Bead -->
        <path
            android:fillColor="#FBBF24"
            android:pathData="M385,358 C385,352.48 389.48,348 395,348 C400.52,348 405,352.48 405,358 C405,363.52 400.52,368 395,368 C389.48,368 385,363.52 385,358 Z" />
    </group>
</vector>
`;

fs.writeFileSync(path.join(resDir, 'drawable', 'ic_launcher_foreground.xml'), vectorXml);
if (fs.existsSync(path.join(resDir, 'drawable-v24'))) {
  fs.writeFileSync(path.join(resDir, 'drawable-v24', 'ic_launcher_foreground.xml'), vectorXml);
}

// Background color for adaptive icon
const bgXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#4F46E5</color>
</resources>
`;
fs.writeFileSync(path.join(resDir, 'values', 'ic_launcher_background.xml'), bgXml);

console.log('Successfully generated all Spirit Android launcher icons, splash screens, and adaptive vectors!');

