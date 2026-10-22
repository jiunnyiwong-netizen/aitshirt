"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { useCart } from "@/lib/cart/store";
import { formatRM } from "@/lib/money";
import { DPI_POOR, DPI_WARN, effectiveDpi, type DesignTransform } from "@/lib/print-area";
import { supabaseBrowser } from "@/lib/supabase/browser";
import type { Product } from "@/lib/products";
import type { DesignerExport } from "./DesignerCanvas";
import { UploadNotice } from "./UploadNotice";

// Konva needs the browser.
const DesignerCanvas = dynamic(() => import("./DesignerCanvas"), {
  ssr: false,
  loading: () => <div className="aspect-square w-full animate-pulse rounded-xl bg-neutral-100" />,
});

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

type Upload = { designId: string; done: Promise<void> };

export function ProductDesigner({ product }: { product: Product }) {
  const [colourKey, setColourKey] = useState(product.colours[0].key);
  const [size, setSize] = useState<string | null>(null);
  const [consented, setConsented] = useState(false);
  const [photo, setPhoto] = useState<HTMLImageElement | null>(null);
  const [transform, setTransform] = useState<DesignTransform | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "added">("idle");
  const [error, setError] = useState<string | null>(null);
  const upload = useRef<Upload | null>(null);
  const exportRef = useRef<DesignerExport | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const addToCart = useCart((s) => s.add);

  const colour = product.colours.find((c) => c.key === colourKey)!;
  const onTransform = useCallback((t: DesignTransform | null) => setTransform(t), []);
  const dpi = photo && transform ? effectiveDpi(photo.naturalWidth, transform.width) : null;

  async function onFile(file: File | undefined) {
    setError(null);
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) return setError("Please choose a JPG, PNG or WebP photo.");
    if (file.size > MAX_UPLOAD_BYTES) return setError("That photo is over 20 MB. Please choose a smaller one.");

    const img = new Image();
    img.src = URL.createObjectURL(file);
    try {
      await img.decode();
    } catch {
      return setError("We couldn't open that photo. Please try another.");
    }
    setPhoto(img);
    setStatus("idle");
    upload.current = startUpload(file);
  }

  // Uploads the original in the background while the customer positions it.
  function startUpload(file: File): Upload {
    const result: Upload = { designId: "", done: Promise.resolve() };
    result.done = (async () => {
      const res = await fetch("/api/designs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, colour: colourKey, contentType: file.type, consent: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      result.designId = json.designId;
      const { error } = await supabaseBrowser()
        .storage.from("designs")
        .uploadToSignedUrl(json.path, json.token, file, { contentType: file.type });
      if (error) throw new Error("Upload failed. Please check your connection and try again.");
    })();
    result.done.catch(() => {}); // surfaced when adding to cart
    return result;
  }

  async function onAddToCart() {
    setError(null);
    if (!size) return setError("Please choose a size.");
    if (!upload.current || !transform || !exportRef.current) return setError("Please add your photo first.");
    setStatus("saving");
    try {
      await upload.current.done;
      const res = await fetch(`/api/designs/${upload.current.designId}/render`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ colour: colourKey, transform, preview: exportRef.current.preview() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not save your design");
      addToCart({
        designId: upload.current.designId,
        productId: product.id,
        slug: product.slug,
        productName: product.name,
        colour: colour.key,
        colourName: colour.name,
        size,
        quantity: 1,
        unitPriceSen: product.price_sen,
        thumbnail: exportRef.current.thumbnail(),
      });
      setStatus("added");
    } catch (e) {
      setStatus("idle");
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    }
  }

  function startOver() {
    setPhoto(null);
    setTransform(null);
    setSize(null);
    upload.current = null;
    setStatus("idle");
    if (fileInput.current) fileInput.current.value = "";
  }

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-xl border border-neutral-200">
        <DesignerCanvas
          mockupSrc={colour.mockup}
          printArea={product.print_area}
          photo={photo}
          onChange={onTransform}
          exportRef={exportRef}
        />
      </div>

      {photo && <p className="text-xs text-neutral-500">Drag to move. Pinch or use the corner handles to resize and rotate. The dashed box is the print area.</p>}

      {dpi !== null && dpi < DPI_WARN && (
        <p className={`rounded-lg p-3 text-sm ${dpi < DPI_POOR ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-900"}`}>
          {dpi < DPI_POOR
            ? `At this size your photo will print blurry (${dpi} DPI). Make it smaller or use a larger photo.`
            : `At this size your photo may print a little soft (${dpi} DPI). Smaller looks sharper.`}
        </p>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold">Colour: {colour.name}</h2>
        <div className="flex gap-3">
          {product.colours.map((c) => (
            <button
              key={c.key}
              type="button"
              aria-label={c.name}
              aria-pressed={c.key === colourKey}
              onClick={() => setColourKey(c.key)}
              className={`h-11 w-11 rounded-full border-2 ${c.key === colourKey ? "border-blue-600 ring-2 ring-blue-200" : "border-neutral-300"}`}
              style={{ backgroundColor: c.hex }}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold">Size</h2>
        <div className="grid grid-cols-6 gap-2">
          {product.sizes.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={s === size}
              onClick={() => setSize(s)}
              className={`h-11 rounded-lg border text-sm font-medium ${s === size ? "border-blue-600 bg-blue-600 text-white" : "border-neutral-300 bg-white text-neutral-800"}`}
            >
              {s}
            </button>
          ))}
        </div>
      </section>

      <section>
        {!consented ? (
          <UploadNotice onAccept={() => setConsented(true)} />
        ) : (
          <label className="flex h-12 w-full cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 text-sm font-medium text-neutral-700">
            {photo ? "Change photo" : "Upload your photo"}
            <input
              ref={fileInput}
              type="file"
              accept={ACCEPTED.join(",")}
              className="sr-only"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
          </label>
        )}
      </section>

      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      {status === "added" ? (
        <div className="space-y-2 rounded-lg bg-green-50 p-4 text-sm text-green-900">
          <p className="font-medium">Added to your cart.</p>
          <div className="flex gap-2">
            <Link href="/cart" className="flex h-11 flex-1 items-center justify-center rounded-lg bg-neutral-900 font-medium text-white">
              Go to cart
            </Link>
            <button type="button" onClick={startOver} className="h-11 flex-1 rounded-lg border border-neutral-300 bg-white font-medium">
              Design another
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onAddToCart}
          disabled={status === "saving"}
          className="h-12 w-full rounded-lg bg-neutral-900 font-semibold text-white disabled:opacity-60"
        >
          {status === "saving" ? "Saving your design…" : `Add to cart · ${formatRM(product.price_sen)}`}
        </button>
      )}
    </div>
  );
}
