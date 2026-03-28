const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'assets', 'hero_spatial.png');
const buffer = fs.readFileSync(filePath);

// Simple PNG dimension extractor
const width = buffer.readUInt32BE(16);
const height = buffer.readUInt32BE(20);

const base64 = buffer.toString('base64');
const svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <clipPath id="clip">
      <rect width="${width}" height="${height}" rx="${Math.floor(width * 0.03)}" ry="${Math.floor(width * 0.03)}" />
    </clipPath>
  </defs>
  <image href="data:image/png;base64,${base64}" width="${width}" height="${height}" clip-path="url(#clip)" />
</svg>`;

fs.writeFileSync(path.join(__dirname, 'assets', 'hero_rounded.svg'), svg);
console.log(`Generated SVG with rounded corners: ${width}x${height}`);
