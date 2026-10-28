// Generates the Android launcher icons for Radiobeast from the in-app brand mark:
//   - launch-icon-512.png            regular (full-bleed square, launcher masks it)
//   - launch-icon-maskable-512.png   safe-zone padded for circular masks
//   - launch-icon-monochrome-512.png Android 13+ themed icon silhouette
// Run: node scripts/generate-launcher-icons.mjs
import sharp from "sharp";

const OUT = new URL("../public/icons/", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");

const emblem = (k) => `
  <g transform="translate(256 256) scale(${k}) translate(-12 -12)"
     stroke="#ffffff" fill="none" stroke-width="1.8" stroke-linecap="round">
    <circle cx="12" cy="12" r="9"/>
    <path d="M12 7a5 5 0 0 1 5 5"/>
    <path d="M12 10a2 2 0 0 1 2 2"/>
  </g>
  <circle cx="256" cy="256" r="${Math.round(1.3 * k)}" fill="#ffffff"/>`;

const defs = `
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ff5f4b"/>
      <stop offset="0.55" stop-color="#ff3b30"/>
      <stop offset="1" stop-color="#c81f14"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.28" cy="0.2" r="0.9">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.22"/>
      <stop offset="0.5" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>`;

// Regular: emblem fills more of the tile; live dot outside the arcs, top-right.
const anySvg = (dot) => `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">${defs}
  <rect width="512" height="512" fill="url(#bg)"/>
  <rect width="512" height="512" fill="url(#glow)"/>
  ${emblem(16)}
  <circle cx="${dot.cx}" cy="${dot.cy}" r="${dot.r}" fill="#22c55e" stroke="#ffffff" stroke-width="${dot.stroke}"/>
</svg>`;

// Maskable: shrink emblem so all ink stays inside the 80% safe-zone circle (r=204).
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">${defs}
  <rect width="512" height="512" fill="url(#bg)"/>
  <rect width="512" height="512" fill="url(#glow)"/>
  ${emblem(13)}
  <circle cx="369" cy="143" r="22" fill="#22c55e" stroke="#ffffff" stroke-width="6"/>
</svg>`;

// Monochrome (themed icon): silhouette only, no background.
const monoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  ${emblem(16)}
  <circle cx="401" cy="111" r="26" fill="#ffffff"/>
</svg>`;

const jobs = [
  ["launch-icon-512.png", anySvg({ cx: 401, cy: 111, r: 26, stroke: 7 })],
  ["launch-icon-maskable-512.png", maskableSvg],
  ["launch-icon-monochrome-512.png", monoSvg],
];

for (const [name, svg] of jobs) {
  await sharp(Buffer.from(svg)).png().toFile(OUT + name);
  console.log("wrote", name);
}
