import fs from 'fs';
import path from 'path';

const SEQUENCE_DIR = path.join(process.cwd(), 'public', 'sequence');

if (!fs.existsSync(SEQUENCE_DIR)) {
  fs.mkdirSync(SEQUENCE_DIR, { recursive: true });
}

for (let i = 1; i <= 84; i++) {
  const frameStr = i.toString().padStart(3, '0');
  
  // Create a gradient that slightly shifts based on frame index to simulate movement
  const hue = 40 + (i * 0.5); // Golden hues
  const svg = `
<svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="hsl(${hue}, 40%, 15%)" />
      <stop offset="100%" stop-color="hsl(${hue - 10}, 80%, 30%)" />
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  
  <!-- Silhouette placeholder -->
  <circle cx="960" cy="${540 + (i * 2)}" r="${108 + (i * 2)}" fill="#111" />
  
  <!-- Frame text -->
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="monospace" font-size="120" fill="white" opacity="0.1">
    FRAME ${frameStr}
  </text>
</svg>
  `.trim();

  fs.writeFileSync(path.join(SEQUENCE_DIR, `frame_${frameStr}.svg`), svg);
}

console.log('Successfully generated 84 placeholder SVG frames in public/sequence/');
