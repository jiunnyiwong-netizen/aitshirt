// Print area maths shared by the browser designer and the server renderer.

// A3 portrait at 300 DPI.
export const PRINT_DPI = 300;
export const A3_WIDTH_IN = 297 / 25.4;
export const A3_HEIGHT_IN = 420 / 25.4;
export const PRINT_WIDTH_PX = Math.round(A3_WIDTH_IN * PRINT_DPI); // 3508
export const PRINT_HEIGHT_PX = Math.round(A3_HEIGHT_IN * PRINT_DPI); // 4961

// Below this the print may look soft; below the hard limit it will look blurry.
export const DPI_WARN = 150;
export const DPI_POOR = 100;

// Largest the photo may be scaled to, as a multiple of the print area width.
// Keeps the server render within memory on Vercel.
export const MAX_WIDTH_FRACTION = 2;

export type PrintArea = {
  mockup_width: number;
  mockup_height: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

// Where the customer put their photo, relative to the print area so it is
// independent of screen size: centre (cx, cy) and width as fractions of the
// print area, rotation in degrees clockwise.
export type DesignTransform = {
  cx: number;
  cy: number;
  width: number;
  rotation: number;
};

// DPI the photo will print at, given its pixel width and how wide it is placed.
export function effectiveDpi(sourceWidthPx: number, widthFraction: number): number {
  const printedInches = widthFraction * A3_WIDTH_IN;
  if (printedInches <= 0) return 0;
  return Math.round(sourceWidthPx / printedInches);
}
