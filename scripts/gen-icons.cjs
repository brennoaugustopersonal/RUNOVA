const fs = require('fs');
const path = require('path');

function makeSvg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ff6d2e"/>
      <stop offset="100%" stop-color="#ffb800"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="#070709"/>
  <circle cx="${size / 2}" cy="${size / 2}" r="${size * 0.38}" fill="url(#g)"/>
  <text x="${size / 2}" y="${size / 2 + size * 0.12}" text-anchor="middle" font-size="${size * 0.35}" font-weight="900" font-family="Arial,sans-serif" fill="#070709">R</text>
</svg>`;
}

const dir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

[192, 512].forEach(size => {
  fs.writeFileSync(path.join(dir, `icon-${size}.svg`), makeSvg(size));
  console.log(`Created icon-${size}.svg`);
});

console.log('Done.');
