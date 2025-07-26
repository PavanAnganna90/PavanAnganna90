/**
 * Icon Generator for OpsSight PWA
 * Creates SVG-based icons in multiple sizes for PWA manifest
 */

const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// SVG icon template for OpsSight
const svgTemplate = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#6366f1;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#10b981;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#059669;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background circle -->
  <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 4}" fill="url(#bg)" stroke="#1e293b" stroke-width="2"/>
  
  <!-- OpsSight logo elements -->
  <!-- Eye symbol for "Sight" -->
  <ellipse cx="${size/2}" cy="${size/2 - size/8}" rx="${size/4}" ry="${size/6}" fill="none" stroke="#ffffff" stroke-width="${size/32}" opacity="0.9"/>
  <circle cx="${size/2}" cy="${size/2 - size/8}" r="${size/12}" fill="#ffffff" opacity="0.9"/>
  <circle cx="${size/2}" cy="${size/2 - size/8}" r="${size/24}" fill="#0a0e27"/>
  
  <!-- Ops gear -->
  <g transform="translate(${size/2}, ${size/2 + size/6})">
    <circle r="${size/8}" fill="none" stroke="url(#accent)" stroke-width="${size/40}"/>
    <circle r="${size/16}" fill="url(#accent)"/>
    ${Array.from({length: 8}, (_, i) => {
      const angle = (i * 45) * Math.PI / 180;
      const x1 = Math.cos(angle) * size/12;
      const y1 = Math.sin(angle) * size/12;
      const x2 = Math.cos(angle) * size/8;
      const y2 = Math.sin(angle) * size/8;
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="url(#accent)" stroke-width="${size/80}"/>`;
    }).join('')}
  </g>
  
  <!-- Connection lines -->
  <line x1="${size/3}" y1="${size/2 - size/12}" x2="${size/3}" y2="${size/2 + size/12}" stroke="#ffffff" stroke-width="${size/80}" opacity="0.6"/>
  <line x1="${size*2/3}" y1="${size/2 - size/12}" x2="${size*2/3}" y2="${size/2 + size/12}" stroke="#ffffff" stroke-width="${size/80}" opacity="0.6"/>
</svg>
`;

// Create placeholder icons (since we can't generate actual PNGs without image libraries)
const createPlaceholderIcon = (size) => {
  const content = `<!-- OpsSight Icon ${size}x${size} - Replace with actual PNG -->
${svgTemplate(size)}`;
  
  fs.writeFileSync(`icon-${size}x${size}.svg`, content);
  console.log(`Created placeholder icon-${size}x${size}.svg`);
};

// Generate all icon sizes
sizes.forEach(createPlaceholderIcon);

console.log('Icon generation complete. Convert SVGs to PNGs using your preferred tool.');
console.log('Recommended: Use online converter or imagemagick: convert icon.svg icon.png');