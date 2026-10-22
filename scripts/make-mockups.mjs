// Draws simple front-view shirt mockups (1000x1000 PNG) for each colour.
// Placeholder until real product photos are available. Run: node scripts/make-mockups.mjs
import sharp from "sharp";

const colours = {
  white: { fill: "#f4f4f1", line: "#c9c9c3", shade: "#000000" },
  black: { fill: "#1c1c1c", line: "#3a3a3a", shade: "#000000" },
  navy: { fill: "#1f2a44", line: "#33405f", shade: "#000000" },
};

const body =
  "M410 110 C440 165 560 165 590 110 L700 140 L910 300 L825 440 L755 395 L748 900 Q500 915 252 900 L245 395 L175 440 L90 300 L300 140 Z";

for (const [name, c] of Object.entries(colours)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000" viewBox="0 0 1000 1000">
  <defs>
    <linearGradient id="g" x1="0" x2="1">
      <stop offset="0" stop-color="${c.shade}" stop-opacity="0.10"/>
      <stop offset="0.25" stop-color="${c.shade}" stop-opacity="0"/>
      <stop offset="0.75" stop-color="${c.shade}" stop-opacity="0"/>
      <stop offset="1" stop-color="${c.shade}" stop-opacity="0.10"/>
    </linearGradient>
  </defs>
  <path d="${body}" fill="${c.fill}" stroke="${c.line}" stroke-width="4" stroke-linejoin="round"/>
  <path d="${body}" fill="url(#g)"/>
  <path d="M410 110 C440 165 560 165 590 110" fill="none" stroke="${c.line}" stroke-width="14" stroke-linecap="round"/>
  <path d="M245 395 L252 890 M755 395 L748 890" fill="none" stroke="${c.line}" stroke-width="2" opacity="0.6"/>
</svg>`;
  await sharp(Buffer.from(svg)).png().toFile(`public/mockups/${name}.png`);
  console.log(`public/mockups/${name}.png`);
}
