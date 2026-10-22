// Photo styles offered by "Restyle with AI". Safe to import in the browser.

export const STYLES = [
  { key: "original", label: "Original", hint: "Your photo as it is" },
  { key: "cartoon", label: "Cartoon", hint: "Bold lines, bright colours" },
  { key: "anime", label: "Anime", hint: "Japanese animation look" },
  { key: "lineart", label: "Line art", hint: "Black ink drawing" },
  { key: "popart", label: "Pop art", hint: "Retro comic print" },
  { key: "watercolour", label: "Watercolour", hint: "Soft painted look" },
  { key: "cutout", label: "Cut out", hint: "Removes the background" },
] as const;

export type StyleKey = (typeof STYLES)[number]["key"];
export type AiStyleKey = Exclude<StyleKey, "original">;

export const STYLE_KEYS = STYLES.map((s) => s.key) as [StyleKey, ...StyleKey[]];

// Where a design's restyled image is stored.
export const stylePath = (designId: string, style: AiStyleKey) => `${designId}/style-${style}.png`;
