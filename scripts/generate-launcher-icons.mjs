// Generates every Radiobeast icon from one brand mark so the website, installed
// PWA, Android TWA launcher and Play listing all share the same identity:
//   public/icons/               web + PWA + Apple touch icons
//   android-twa/.../mipmap-*    launcher icons (regular + maskable)
//   android-twa/.../drawable-*  splash screen + app shortcuts
//   android-twa/store_icon.png  Play Store listing icon
// Run: node scripts/generate-launcher-icons.mjs
import sharp from "sharp";

const ROOT = new URL("../", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
const WEB = ROOT + "public/icons/";
const RES = ROOT + "android-twa/app/src/main/res/";

// Bold "signal" emblem: a heavy ring with two thick arcs radiating from a dot.
// No green "live" badge — it read as a notification dot and vanished at 48px.
// Coordinates are in a 100x100 space, scaled to the tile by `s`.
const emblem = (s, color = "#ffffff") => `
  <g transform="translate(256 256) scale(${s}) translate(-50 -50)"
     stroke="${color}" fill="${color}" stroke-linecap="round">
    <circle cx="50" cy="50" r="31" fill="none" stroke-width="8"/>
    <circle cx="40" cy="61" r="6.5" stroke="none"/>
    <path d="M40 49 A12 12 0 0 1 52 61" fill="none" stroke-width="7"/>
    <path d="M40 38 A23 23 0 0 1 63 61" fill="none" stroke-width="7"/>
  </g>`;

const defs = `
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ff5f4b"/>
      <stop offset="0.55" stop-color="#ff3b30"/>
      <stop offset="1" stop-color="#c81f14"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.28" cy="0.2" r="0.9">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.16"/>
      <stop offset="0.5" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>`;

const FULL = 5.12; // 100-unit emblem scaled to a 512 tile
const anySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">${defs}
  <rect width="512" height="512" fill="url(#bg)"/>
  <rect width="512" height="512" fill="url(#glow)"/>
  ${emblem(FULL)}
</svg>`;

// Maskable: all ink stays well inside the 80% safe-zone circle (r=204).
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">${defs}
  <rect width="512" height="512" fill="url(#bg)"/>
  <rect width="512" height="512" fill="url(#glow)"/>
  ${emblem(FULL * 0.82)}
</svg>`;

// Themed icon (Android 13+): solid silhouette on transparent, tinted by the OS.
const monoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  ${emblem(FULL)}
</svg>`;

const jobs = [
  [WEB + "launch-icon-512.png", anySvg, 512],
  [WEB + "launch-icon-maskable-512.png", maskableSvg, 512],
  [WEB + "launch-icon-monochrome-512.png", monoSvg, 512],
  [ROOT + "android-twa/store_icon.png", anySvg, 512],
];

// Web / PWA / Apple / favicon — all the same red design.
for (const [name, size] of [
  ["icon-512x512.png", 512],
  ["icon-192x192.png", 192],
  ["apple-touch-icon.png", 180],
  ["icon-48x48.png", 48],
  ["icon-32x32.png", 32],
]) {
  jobs.push([WEB + name, anySvg, size]);
}

// Android launcher icons. ic_launcher is a square full-bleed tile (the system
// applies its own mask); ic_maskable is the 108dp adaptive safe-zone version.
const densities = [
  ["mdpi", 48, 82],
  ["hdpi", 72, 123],
  ["xhdpi", 96, 164],
  ["xxhdpi", 144, 246],
  ["xxxhdpi", 192, 328],
];
for (const [density, launcherSize, maskableSize] of densities) {
  jobs.push([`${RES}mipmap-${density}/ic_launcher.png`, anySvg, launcherSize]);
  jobs.push([`${RES}mipmap-${density}/ic_maskable.png`, maskableSvg, maskableSize]);
  // Splash screen is just the icon tile, centered by the platform.
  jobs.push([`${RES}drawable-${density}/splash.png`, anySvg, Math.round(launcherSize * 6.25)]);
  // App shortcuts use the standard 192 icon, resized per density.
  for (const n of [0, 1]) {
    jobs.push([`${RES}drawable-${density}/shortcut_${n}.png`, anySvg, launcherSize]);
  }
}

for (const [file, svg, size] of jobs) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(file);
  console.log("wrote", file.replace(ROOT, ""), `${size}x${size}`);
}
