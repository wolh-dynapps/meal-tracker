#!/usr/bin/env node
/**
 * Script to generate PWA icons for Meal Tracker
 * Run with: node scripts/generate-icons.js
 *
 * Requires: npm install canvas
 */

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const ICONS_DIR = path.join(__dirname, '..', 'docs', 'icons');

// Ensure icons directory exists
if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

// Icon configurations
const iconConfigs = [
  { size: 192, filename: 'icon-192x192.png', cornerRadius: 24 },
  { size: 512, filename: 'icon-512x512.png', cornerRadius: 64 },
  { size: 180, filename: 'apple-touch-icon.png', cornerRadius: 40 },
  { size: 512, filename: 'icon-512x512-maskable.png', cornerRadius: 0, maskable: true },
];

// Colors
const BACKGROUND_COLOR = '#4285F4';
const FOREGROUND_COLOR = '#FFFFFF';

/**
 * Draw a rounded rectangle
 */
function roundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Draw a simple plate icon (circle with inner ring and utensils)
 */
function drawPlateIcon(ctx, size) {
  const centerX = size / 2;
  const centerY = size / 2;
  const plateRadius = size * 0.32;
  const innerRadius = size * 0.22;
  const rimWidth = size * 0.02;

  ctx.fillStyle = FOREGROUND_COLOR;
  ctx.strokeStyle = FOREGROUND_COLOR;
  ctx.lineWidth = rimWidth;

  // Draw outer plate circle
  ctx.beginPath();
  ctx.arc(centerX, centerY, plateRadius, 0, Math.PI * 2);
  ctx.stroke();

  // Draw inner plate circle (the eating surface)
  ctx.beginPath();
  ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
  ctx.stroke();

  // Draw fork (left side)
  const forkX = centerX - plateRadius - size * 0.08;
  const forkTop = centerY - size * 0.2;
  const forkBottom = centerY + size * 0.2;
  const forkWidth = size * 0.025;
  const tineHeight = size * 0.1;
  const tineSpacing = size * 0.02;

  ctx.lineWidth = forkWidth;
  ctx.lineCap = 'round';

  // Fork handle
  ctx.beginPath();
  ctx.moveTo(forkX, forkTop + tineHeight);
  ctx.lineTo(forkX, forkBottom);
  ctx.stroke();

  // Fork tines
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(forkX + i * tineSpacing, forkTop);
    ctx.lineTo(forkX + i * tineSpacing, forkTop + tineHeight);
    ctx.stroke();
  }

  // Connect tines
  ctx.beginPath();
  ctx.moveTo(forkX - tineSpacing, forkTop + tineHeight);
  ctx.lineTo(forkX + tineSpacing, forkTop + tineHeight);
  ctx.stroke();

  // Draw knife (right side)
  const knifeX = centerX + plateRadius + size * 0.08;
  const knifeTop = centerY - size * 0.2;
  const knifeBottom = centerY + size * 0.2;
  const bladeWidth = size * 0.04;

  // Knife blade
  ctx.beginPath();
  ctx.moveTo(knifeX - bladeWidth / 2, knifeTop);
  ctx.lineTo(knifeX + bladeWidth / 2, knifeTop + size * 0.03);
  ctx.lineTo(knifeX + bladeWidth / 2, knifeTop + size * 0.15);
  ctx.lineTo(knifeX, knifeTop + size * 0.18);
  ctx.lineTo(knifeX, knifeBottom);
  ctx.lineTo(knifeX, knifeTop + size * 0.18);
  ctx.lineTo(knifeX - bladeWidth / 2, knifeTop + size * 0.15);
  ctx.lineTo(knifeX - bladeWidth / 2, knifeTop);
  ctx.closePath();
  ctx.fill();

  // Knife handle
  ctx.lineWidth = forkWidth;
  ctx.beginPath();
  ctx.moveTo(knifeX, knifeTop + size * 0.18);
  ctx.lineTo(knifeX, knifeBottom);
  ctx.stroke();
}

/**
 * Generate a single icon
 */
function generateIcon(config) {
  const { size, filename, cornerRadius, maskable } = config;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Draw background
  ctx.fillStyle = BACKGROUND_COLOR;
  if (cornerRadius > 0 && !maskable) {
    roundedRect(ctx, 0, 0, size, size, cornerRadius);
    ctx.fill();
  } else {
    ctx.fillRect(0, 0, size, size);
  }

  // Draw the plate icon
  drawPlateIcon(ctx, size);

  // Save to file
  const outputPath = path.join(ICONS_DIR, filename);
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
  console.log(`Generated: ${outputPath}`);
}

// Generate all icons
console.log('Generating PWA icons...\n');
iconConfigs.forEach(generateIcon);
console.log('\nDone! Icons generated in:', ICONS_DIR);
