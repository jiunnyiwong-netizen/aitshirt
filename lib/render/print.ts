import "server-only";
import sharp, { type OverlayOptions } from "sharp";
import {
  MAX_WIDTH_FRACTION,
  PRINT_DPI,
  PRINT_HEIGHT_PX,
  PRINT_WIDTH_PX,
  type DesignTransform,
} from "@/lib/print-area";

const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

// Rebuilds the customer's design as a transparent A3 PNG at 300 DPI.
// Done on the server because phone browsers cannot draw a canvas this large.
export async function renderPrintPng(original: Buffer, t: DesignTransform): Promise<Buffer> {
  const meta = await sharp(original).metadata();
  if (!meta.width || !meta.height) throw new Error("Could not read the uploaded image");
  // EXIF orientations 5-8 are rotated by 90 degrees, so width and height swap.
  const sideways = (meta.orientation ?? 1) >= 5;
  const srcW = sideways ? meta.height : meta.width;
  const srcH = sideways ? meta.width : meta.height;

  const widthFraction = Math.min(Math.max(t.width, 0.01), MAX_WIDTH_FRACTION);
  const targetW = Math.max(1, Math.round(widthFraction * PRINT_WIDTH_PX));
  const targetH = Math.max(1, Math.round((targetW * srcH) / srcW));

  // sharp applies one rotate per pipeline: first fix EXIF orientation and resize...
  const sized = await sharp(original)
    .rotate()
    .resize(targetW, targetH, { fit: "fill" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // ...then apply the customer's rotation. The canvas grows to fit; the centre stays the centre.
  const rotated = await sharp(sized.data, { raw: sized.info })
    .rotate(t.rotation, { background: TRANSPARENT })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const rw = rotated.info.width;
  const rh = rotated.info.height;

  const left = Math.round(t.cx * PRINT_WIDTH_PX - rw / 2);
  const top = Math.round(t.cy * PRINT_HEIGHT_PX - rh / 2);

  // Keep only the part that falls inside the print area.
  const x0 = Math.max(0, left);
  const y0 = Math.max(0, top);
  const x1 = Math.min(PRINT_WIDTH_PX, left + rw);
  const y1 = Math.min(PRINT_HEIGHT_PX, top + rh);

  const canvas = sharp({
    create: { width: PRINT_WIDTH_PX, height: PRINT_HEIGHT_PX, channels: 4, background: TRANSPARENT },
  });

  const layers: OverlayOptions[] = [];
  if (x1 > x0 && y1 > y0) {
    const visible = await sharp(rotated.data, { raw: rotated.info })
      .extract({ left: x0 - left, top: y0 - top, width: x1 - x0, height: y1 - y0 })
      .png()
      .toBuffer();
    layers.push({ input: visible, left: x0, top: y0 });
  }

  return canvas
    .composite(layers)
    .withMetadata({ density: PRINT_DPI })
    .png({ compressionLevel: 6 })
    .toBuffer();
}
