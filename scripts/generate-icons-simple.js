#!/usr/bin/env node
/**
 * Simple PNG icon generator for Meal Tracker PWA
 * Uses pure JavaScript to create minimal PNG files (no external dependencies)
 * Run with: node scripts/generate-icons-simple.js
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ICONS_DIR = path.join(__dirname, '..', 'docs', 'icons');

// Ensure icons directory exists
if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

// Colors
const BG_COLOR = { r: 66, g: 133, b: 244 };     // #4285F4
const FG_COLOR = { r: 255, g: 255, b: 255 };    // White

/**
 * Calculate CRC32 for PNG chunks
 */
function crc32(data) {
  let crc = 0xFFFFFFFF;
  const table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  for (let i = 0; i < data.length; i++) {
    crc = table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

/**
 * Create a PNG chunk
 */
function createChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([typeBytes, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([length, typeAndData, crc]);
}

/**
 * Distance from point to center
 */
function distance(x, y, cx, cy) {
  return Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
}

/**
 * Check if point is on a ring (circle outline)
 */
function isOnRing(x, y, cx, cy, radius, thickness) {
  const d = distance(x, y, cx, cy);
  return d >= radius - thickness / 2 && d <= radius + thickness / 2;
}

/**
 * Check if point is within rounded rectangle
 */
function isInRoundedRect(x, y, width, height, radius) {
  if (x < radius) {
    if (y < radius) return distance(x, y, radius, radius) <= radius;
    if (y > height - radius) return distance(x, y, radius, height - radius) <= radius;
  } else if (x > width - radius) {
    if (y < radius) return distance(x, y, width - radius, radius) <= radius;
    if (y > height - radius) return distance(x, y, width - radius, height - radius) <= radius;
  }
  return x >= 0 && x < width && y >= 0 && y < height;
}

/**
 * Draw the plate icon pattern
 */
function isPlatePixel(x, y, size) {
  const cx = size / 2;
  const cy = size / 2;
  const plateRadius = size * 0.32;
  const innerRadius = size * 0.22;
  const thickness = size * 0.025;

  // Outer plate ring
  if (isOnRing(x, y, cx, cy, plateRadius, thickness)) return true;

  // Inner plate ring
  if (isOnRing(x, y, cx, cy, innerRadius, thickness)) return true;

  // Fork (left side)
  const forkX = cx - plateRadius - size * 0.08;
  const forkTop = cy - size * 0.2;
  const forkBottom = cy + size * 0.2;
  const forkWidth = size * 0.025;
  const tineHeight = size * 0.1;
  const tineSpacing = size * 0.02;

  // Fork handle
  if (Math.abs(x - forkX) <= forkWidth / 2 && y >= forkTop + tineHeight && y <= forkBottom) return true;

  // Fork tines
  for (let i = -1; i <= 1; i++) {
    const tineX = forkX + i * tineSpacing;
    if (Math.abs(x - tineX) <= forkWidth / 2 && y >= forkTop && y <= forkTop + tineHeight) return true;
  }

  // Fork tine connector
  if (Math.abs(y - (forkTop + tineHeight)) <= forkWidth / 2 &&
      x >= forkX - tineSpacing - forkWidth / 2 && x <= forkX + tineSpacing + forkWidth / 2) return true;

  // Knife (right side)
  const knifeX = cx + plateRadius + size * 0.08;
  const knifeTop = cy - size * 0.2;
  const knifeBottom = cy + size * 0.2;
  const bladeWidth = size * 0.04;
  const bladeHeight = size * 0.15;

  // Knife blade (rounded top)
  if (y >= knifeTop && y <= knifeTop + bladeHeight) {
    const bladeProgress = (y - knifeTop) / bladeHeight;
    const currentWidth = bladeWidth * (0.3 + bladeProgress * 0.7);
    if (Math.abs(x - knifeX) <= currentWidth / 2) return true;
  }

  // Knife handle
  if (Math.abs(x - knifeX) <= forkWidth / 2 && y >= knifeTop + bladeHeight && y <= knifeBottom) return true;

  return false;
}

/**
 * Generate PNG image data
 */
function generatePNG(size, cornerRadius, isMaskable = false) {
  // Create raw image data (RGBA)
  const pixels = [];

  for (let y = 0; y < size; y++) {
    pixels.push(0); // Filter byte for each row
    for (let x = 0; x < size; x++) {
      let r, g, b, a;

      // Check if pixel is within the icon shape
      const inShape = isMaskable || cornerRadius === 0
        ? true
        : isInRoundedRect(x, y, size, size, cornerRadius);

      if (!inShape) {
        // Transparent pixel
        r = g = b = a = 0;
      } else if (isPlatePixel(x, y, size)) {
        // Foreground (plate icon)
        r = FG_COLOR.r;
        g = FG_COLOR.g;
        b = FG_COLOR.b;
        a = 255;
      } else {
        // Background
        r = BG_COLOR.r;
        g = BG_COLOR.g;
        b = BG_COLOR.b;
        a = 255;
      }

      pixels.push(r, g, b, a);
    }
  }

  // Compress image data
  const rawData = Buffer.from(pixels);
  const compressedData = zlib.deflateSync(rawData, { level: 9 });

  // Build PNG file
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);      // Width
  ihdr.writeUInt32BE(size, 4);      // Height
  ihdr.writeUInt8(8, 8);            // Bit depth
  ihdr.writeUInt8(6, 9);            // Color type (RGBA)
  ihdr.writeUInt8(0, 10);           // Compression
  ihdr.writeUInt8(0, 11);           // Filter
  ihdr.writeUInt8(0, 12);           // Interlace

  const ihdrChunk = createChunk('IHDR', ihdr);
  const idatChunk = createChunk('IDAT', compressedData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Icon configurations
const iconConfigs = [
  { size: 192, filename: 'icon-192x192.png', cornerRadius: 24 },
  { size: 512, filename: 'icon-512x512.png', cornerRadius: 64 },
  { size: 180, filename: 'apple-touch-icon.png', cornerRadius: 40 },
  { size: 512, filename: 'icon-512x512-maskable.png', cornerRadius: 0, maskable: true },
];

// Generate all icons
console.log('Generating PWA icons (pure JS)...\n');

iconConfigs.forEach(config => {
  const { size, filename, cornerRadius, maskable } = config;
  console.log(`Generating ${filename} (${size}x${size})...`);

  const pngData = generatePNG(size, cornerRadius, maskable);
  const outputPath = path.join(ICONS_DIR, filename);
  fs.writeFileSync(outputPath, pngData);
  console.log(`  -> Created: ${outputPath}`);
});

console.log('\nDone! Icons generated in:', ICONS_DIR);
