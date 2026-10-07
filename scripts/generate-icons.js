import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// Simple CRC32 implementation
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

function generatePng(width, height, isMaskable = false) {
  // Signature
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // 8-bit depth
  ihdr.writeUInt8(6, 9); // RGBA color type
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);
  const ihdrChunk = makeChunk('IHDR', ihdr);

  // Raw image data with scanline filter 0
  const rowSize = width * 4;
  const raw = Buffer.alloc(height * (rowSize + 1));

  const cx = width / 2;
  const cy = height / 2;
  const radius = isMaskable ? width / 2 : width * 0.44;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (rowSize + 1);
    raw[rowOffset] = 0; // Filter None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Base background: Indigo #4f46e5 (79, 70, 229)
      let r = 79;
      let g = 70;
      let b = 229;
      let a = 255;

      if (!isMaskable && dist > radius) {
        // Outside circle for non-maskable icons
        a = 0;
      } else {
        // Subtle gradient towards bottom
        const grad = y / height;
        r = Math.min(255, Math.floor(79 + grad * 20));
        g = Math.min(255, Math.floor(70 + grad * 15));
        b = Math.min(255, Math.floor(229 - grad * 30));

        // Graduation cap / spark icon geometry in the center
        // Safe area scale
        const scale = (isMaskable ? 0.6 : 0.7) * (width / 192);
        const normDx = dx / scale;
        const normDy = dy / scale;

        // Cap Diamond: |normDx| / 2 + |normDy + 12| <= 20
        const inDiamond = (Math.abs(normDx) / 1.8 + Math.abs(normDy + 8)) <= 22;
        // Cap Under-arc: normDy between 0 and 22, |normDx| <= 24, normDy >= (normDx * normDx) / 45 - 2
        const inArc = normDy >= 2 && normDy <= 18 && Math.abs(normDx) <= 22 && normDy >= (normDx * normDx) / 42 - 2;
        // Spark tassel: line from (18, -4) to (24, 18)
        const inTassel = normDx >= 18 && normDx <= 22 && normDy >= -5 && normDy <= 18;

        if (inDiamond || inArc) {
          // Pure white spark emblem
          r = 255;
          g = 255;
          b = 255;
        } else if (inTassel) {
          // Amber/Gold tassel #fbbf24 (251, 191, 36)
          r = 251;
          g = 191;
          b = 36;
        }
      }

      raw[pxOffset] = r;
      raw[pxOffset + 1] = g;
      raw[pxOffset + 2] = b;
      raw[pxOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(raw);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Write icons
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), generatePng(192, 192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), generatePng(512, 512, false));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), generatePng(180, 180, false));
fs.writeFileSync(path.join(publicDir, 'maskable-icon-512x512.png'), generatePng(512, 512, true));

// Write SVG favicon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="128" fill="#4f46e5" />
  <path d="M256 120 L400 200 L256 280 L112 200 Z" fill="#ffffff" />
  <path d="M160 236 L160 330 C160 370 352 370 352 330 L352 236 L256 288 Z" fill="#ffffff" opacity="0.9" />
  <path d="M370 215 L390 280 L395 350" stroke="#fbbf24" stroke-width="12" stroke-linecap="round" fill="none" />
  <circle cx="395" cy="358" r="10" fill="#fbbf24" />
</svg>`;

fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgContent);
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), generatePng(48, 48, false));

console.log('Successfully generated PWA icons and favicons in public/');
