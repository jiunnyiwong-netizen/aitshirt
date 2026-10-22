import "server-only";
import sharp from "sharp";
import { requiredEnv } from "@/lib/env";
import type { AiStyleKey } from "@/lib/ai/styles";

// Gemini image model. gemini-2.5-flash-image is cheap and returns about 1K px.
// A "pro" image model can return 2K/4K for sharper prints, at a higher price per image.
export const geminiModel = () => process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";

const COMMON =
  "Keep the same subject, pose and composition, and keep faces recognisable. " +
  "Do not add any text, letters, borders, frames or watermarks. The result will be printed on a t-shirt.";

// The cut-out style asks for a flat green background, which is then made transparent.
const KEY_GREEN = "#00FF00";

const PROMPTS: Record<AiStyleKey, string> = {
  cartoon: "Redraw this photo as a clean, bold cartoon illustration with thick dark outlines and flat, bright colours.",
  anime: "Redraw this photo in a polished Japanese anime illustration style with clean line work and cel shading.",
  lineart:
    "Turn this photo into black ink line art on a plain white background: confident clean lines, no shading, no grey tones.",
  popart:
    "Turn this photo into 1960s pop art like a screen print: bold flat colours, strong contrast and halftone dots.",
  watercolour: "Turn this photo into a soft watercolour painting with gentle washes of colour and visible paper texture.",
  cutout:
    `Keep the main subject exactly as it is in the photo, unchanged, and replace the entire background with one flat, ` +
    `solid, pure green colour (${KEY_GREEN}). No shadows, gradients or objects in the background.`,
};

const RATIOS = ["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9"] as const;

function closestRatio(width: number, height: number) {
  const target = width / height;
  return RATIOS.reduce((best, r) => {
    const [w, h] = r.split(":").map(Number);
    const [bw, bh] = best.split(":").map(Number);
    return Math.abs(Math.log(w / h / target)) < Math.abs(Math.log(bw / bh / target)) ? r : best;
  });
}

export class GeminiError extends Error {}

// Restyles a photo and returns a PNG.
export async function restylePhoto(original: Buffer, style: AiStyleKey): Promise<Buffer> {
  // Fix phone orientation and keep the request small.
  const input = await sharp(original)
    .rotate()
    .resize(1536, 1536, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 90 })
    .toBuffer({ resolveWithObject: true });

  const model = geminiModel();
  const imageConfig: Record<string, string> = { aspectRatio: closestRatio(input.info.width, input.info.height) };
  if (model.includes("pro")) imageConfig.imageSize = process.env.GEMINI_IMAGE_SIZE || "2K";

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": requiredEnv("GEMINI_API_KEY") },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: `${PROMPTS[style]} ${COMMON}` },
            { inline_data: { mime_type: "image/jpeg", data: input.data.toString("base64") } },
          ],
        },
      ],
      generationConfig: { responseModalities: ["IMAGE"], imageConfig },
    }),
    signal: AbortSignal.timeout(55_000),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new GeminiError(json?.error?.message ?? `Gemini returned ${res.status}`);

  type Part = { inlineData?: { data: string }; inline_data?: { data: string } };
  const parts: Part[] = json?.candidates?.[0]?.content?.parts ?? [];
  const image = parts.map((p) => p.inlineData ?? p.inline_data).find(Boolean);
  if (!image) {
    const reason = json?.candidates?.[0]?.finishReason ?? json?.promptFeedback?.blockReason ?? "no image returned";
    throw new GeminiError(`Gemini did not return an image (${reason})`);
  }

  const png = Buffer.from(image.data, "base64");
  return style === "cutout" ? removeGreen(png) : sharp(png).png().toBuffer();
}

// Makes the flat green background transparent and removes green fringing on the edges.
async function removeGreen(png: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const other = Math.max(r, b);
    const greenness = g - other; // how much greener than the other channels
    if (greenness > 90 && g > 140) {
      data[i + 3] = 0;
    } else if (greenness > 30) {
      // Edge pixel: partly transparent, and pull the green back.
      data[i + 3] = Math.round(255 * (1 - (greenness - 30) / 60));
      data[i + 1] = other;
    }
  }
  return sharp(data, { raw: info }).png().toBuffer();
}
