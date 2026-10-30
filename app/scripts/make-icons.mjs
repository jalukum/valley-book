// Builds the app icons from a real Stardew sprite (the Junimo) on a wood-and-parchment tile.
import sharp from 'sharp';
const SRC = new URL('../../sprites/ui/Junimo_Icon.png', import.meta.url).pathname;
const OUT = new URL('../public/icons/', import.meta.url).pathname;
const trimmed = await sharp(SRC).trim({ threshold: 0 }).png().toBuffer();
const meta = await sharp(trimmed).metadata();
// v6.8 iOS: apple-touch-icon is a full-bleed, square, opaque tile. iOS rounds it with its own squircle (corner radius ≈ 22.4%
// of the side), so the wood border runs straight to the square edges and the parchment's corner radius is made concentric
// with that mask (22.4% − its 10% inset), which leaves an even wood frame all the way round after iOS crops it.
// Parchment size/colours and the Junimo (nearest-neighbour, centred) are identical to the other icons.
export const IOS_RADIUS = 0.2237;
function frame(size, ios) {
  if (!ios) return null;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe2a8"/><stop offset="1" stop-color="#f3c47a"/></linearGradient></defs>
    <rect width="${size}" height="${size}" fill="#7a4419"/>
    <rect x="${size * 0.035}" y="${size * 0.035}" width="${size * 0.93}" height="${size * 0.93}" rx="${size * (IOS_RADIUS - 0.035)}" fill="#b5652a"/>
    <rect x="${size * 0.1}" y="${size * 0.1}" width="${size * 0.8}" height="${size * 0.8}" rx="${size * (IOS_RADIUS - 0.1)}" fill="url(#g)"/>
  </svg>`;
}
async function icon(name, size, pad, ios = false) {
  const bg = Buffer.from(frame(size, ios) ?? `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe2a8"/><stop offset="1" stop-color="#f3c47a"/></linearGradient></defs>
    <rect width="${size}" height="${size}" fill="#7a4419"/>
    <rect x="${size * 0.06}" y="${size * 0.06}" width="${size * 0.88}" height="${size * 0.88}" rx="${size * 0.04}" fill="#b5652a"/>
    <rect x="${size * 0.1}" y="${size * 0.1}" width="${size * 0.8}" height="${size * 0.8}" rx="${size * 0.03}" fill="url(#g)"/>
  </svg>`);
  const target = Math.round(size * (1 - 2 * pad) * 0.62);
  const scale = Math.max(1, Math.floor(target / Math.max(meta.width, meta.height)));
  const w = meta.width * scale, h = meta.height * scale;
  const spr = await sharp(trimmed).resize(w, h, { kernel: 'nearest' }).png().toBuffer();
  let img = sharp(bg).composite([{ input: spr, left: Math.round((size - w) / 2), top: Math.round((size - h) / 2) }]);
  await (ios ? img.flatten({ background: '#7a4419' }).removeAlpha() : img).png().toFile(OUT + name);
}
await icon('icon-192.png', 192, 0);
await icon('icon-512.png', 512, 0);
await icon('apple-touch-icon.png', 180, 0, true);
await icon('icon-maskable-512.png', 512, 0.1);
await icon('favicon-64.png', 64, 0);
console.log('icons written', meta.width, meta.height);
