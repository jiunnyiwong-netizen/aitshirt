// Builds public/hero.png: a shirt mockup with sample artwork, for the home page.
// Run: node scripts/make-hero.mjs (after make-mockups.mjs)
import sharp from "sharp";

const art = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="424" viewBox="0 0 300 424">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffb347"/><stop offset="0.6" stop-color="#f0532d"/><stop offset="1" stop-color="#8e2a5c"/>
    </linearGradient>
    <clipPath id="c"><rect x="10" y="40" width="280" height="340" rx="140"/></clipPath>
  </defs>
  <g clip-path="url(#c)">
    <rect x="0" y="0" width="300" height="424" fill="url(#sky)"/>
    <circle cx="150" cy="220" r="78" fill="#ffe08a"/>
    <g fill="#ffe08a" opacity="0.35">
      <rect x="40" y="200" width="220" height="8"/><rect x="40" y="226" width="220" height="8"/><rect x="40" y="252" width="220" height="8"/>
    </g>
    <path d="M0 300 L70 230 L120 280 L180 210 L300 320 L300 424 L0 424 Z" fill="#3b1d4a"/>
    <path d="M0 340 Q75 320 150 340 T300 340 L300 424 L0 424 Z" fill="#1f2a44"/>
    <g fill="#16161a">
      <rect x="226" y="230" width="8" height="120" transform="rotate(6 230 290)"/>
      <path d="M232 232 q-40 -10 -62 18 q34 -12 62 -10 z M232 232 q40 -12 64 14 q-36 -10 -64 -8 z M232 232 q-20 -34 -54 -36 q30 14 54 40 z M232 232 q22 -32 56 -30 q-32 12 -56 34 z"/>
    </g>
  </g>
  <rect x="10" y="40" width="280" height="340" rx="140" fill="none" stroke="#ffe08a" stroke-width="6"/>
</svg>`;

const artPng = await sharp(Buffer.from(art)).png().toBuffer();
// sharp resizes before compositing, so composite first.
const shirt = await sharp("public/mockups/black.png").composite([{ input: artPng, left: 350, top: 230 }]).png().toBuffer();
await sharp(shirt)
  .resize(800, 800)
  .png()
  .toFile("public/hero.png");
console.log("public/hero.png");
