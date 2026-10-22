"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { STYLES, type StyleKey } from "@/lib/ai/styles";
import { useCart } from "@/lib/cart/store";
import { flags } from "@/lib/flags";
import { formatRM } from "@/lib/money";
import { DPI_POOR, DPI_WARN, effectiveDpi, type DesignTransform } from "@/lib/print-area";
import { supabaseBrowser } from "@/lib/supabase/browser";
import type { Product } from "@/lib/products";
import type { DesignerExport } from "./DesignerCanvas";
import { UploadNotice } from "./UploadNotice";

// Konva needs the browser.
const DesignerCanvas = dynamic(() => import("./DesignerCanvas"), {
  ssr: false,
  loading: () => <div className="aspect-square w-full animate-pulse bg-[#f3f0ea]" />,
});

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

type Upload = { designId: string; done: Promise<void> };

function loadImage(src: string, crossOrigin = false): Promise<HTMLImageElement> {
  const img = new Image();
  if (crossOrigin) img.crossOrigin = "anonymous"; // keeps the canvas exportable
  img.src = src;
  return img.decode().then(() => img);
}

export function ProductDesigner({ product }: { product: Product }) {
  const [colourKey, setColourKey] = useState(product.colours[0].key);
  const [size, setSize] = useState<string | null>(null);
  const [consented, setConsented] = useState(false);
  const [photo, setPhoto] = useState<HTMLImageElement | null>(null);
  const [uploadCount, setUploadCount] = useState(0);
  const [style, setStyle] = useState<StyleKey>("original");
  const [restyling, setRestyling] = useState<StyleKey | null>(null);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [transform, setTransform] = useState<DesignTransform | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "added">("idle");
  const [error, setError] = useState<string | null>(null);
  const upload = useRef<Upload | null>(null);
  const images = useRef<Partial<Record<StyleKey, HTMLImageElement>>>({});
  const exportRef = useRef<DesignerExport | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const addToCart = useCart((s) => s.add);

  const colour = product.colours.find((c) => c.key === colourKey)!;
  const onTransform = useCallback((t: DesignTransform | null) => setTransform(t), []);
  const dpi = photo && transform ? effectiveDpi(photo.naturalWidth, transform.width) : null;

  async function onFile(file: File | undefined) {
    setError(null);
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) return setError("Please choose a JPG, PNG or WebP photo.");
    if (file.size > MAX_UPLOAD_BYTES) return setError("That photo is over 20 MB. Please choose a smaller one.");

    let img: HTMLImageElement;
    try {
      img = await loadImage(URL.createObjectURL(file));
    } catch {
      return setError("We couldn't open that photo. Please try another.");
    }
    images.current = { original: img };
    setStyle("original");
    setAiNote(null);
    setPhoto(img);
    setUploadCount((n) => n + 1);
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
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      result.designId = json.designId;
      const { error } = await supabaseBrowser()
        .storage.from("designs")
        .uploadToSignedUrl(json.path, json.token, file, { contentType: file.type });
      if (error) throw new Error("Upload failed. Please check your connection and try again.");
    })();
    result.done.catch(() => {}); // surfaced when restyling or adding to cart
    return result;
  }

  async function chooseStyle(next: StyleKey) {
    setError(null);
    const cached = images.current[next];
    if (cached) {
      setStyle(next);
      setPhoto(cached);
      return;
    }
    if (!upload.current) return;
    setRestyling(next);
    // On phones the preview is above the fold by now; bring it back so the result is seen.
    previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    try {
      await upload.current.done;
      const res = await fetch(`/api/designs/${upload.current.designId}/restyle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ style: next }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "The AI couldn't restyle this photo.");
      const img = await loadImage(json.url, true);
      images.current[next] = img;
      setStyle(next);
      setPhoto(img);
      setAiNote(
        typeof json.remaining === "number" ? `${json.remaining} free AI restyle${json.remaining === 1 ? "" : "s"} left today.` : null,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setRestyling(null);
    }
  }

  async function onAddToCart() {
    setError(null);
    if (!upload.current || !transform || !exportRef.current) return setError("Add your photo first.");
    if (!size) return setError("Choose a size first.");
    setStatus("saving");
    try {
      await upload.current.done;
      const res = await fetch(`/api/designs/${upload.current.designId}/render`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ colour: colourKey, style, transform, preview: exportRef.current.preview() }),
      });
      const json = await res.json().catch(() => ({}));
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
    setStyle("original");
    setAiNote(null);
    images.current = {};
    upload.current = null;
    setStatus("idle");
    if (fileInput.current) fileInput.current.value = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const busy = status === "saving" || restyling !== null;

  return (
    <div className="grid gap-6 md:grid-cols-2 md:items-start">
      <div ref={previewRef} className="scroll-mt-16 md:sticky md:top-20">
        <div className="relative overflow-hidden rounded-2xl border border-line bg-white">
          <DesignerCanvas
            mockupSrc={colour.mockup}
            printArea={product.print_area}
            photo={photo}
            resetKey={uploadCount}
            onChange={onTransform}
            exportRef={exportRef}
          />
          {!photo && (
            <p className="pointer-events-none absolute inset-x-0 top-[40%] text-center text-sm font-medium text-muted">
              Your photo goes here
            </p>
          )}
          {restyling && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/70 text-sm font-medium backdrop-blur-sm">
              <span className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" aria-hidden />
              Restyling your photo… this takes about 10 to 20 seconds
            </div>
          )}
        </div>
        {photo && (
          <p className="mt-2 text-xs text-muted">
            Drag to move. Pinch or use the corner handles to resize and rotate. Only the part inside the dashed box prints.
          </p>
        )}
      </div>

      <div className="space-y-6">
        <Step n={1} title="Choose your shirt">
          <p className="mb-2 text-sm text-muted">Colour: <span className="font-medium text-ink">{colour.name}</span></p>
          <div className="flex gap-3">
            {product.colours.map((c) => (
              <button
                key={c.key}
                type="button"
                aria-label={c.name}
                aria-pressed={c.key === colourKey}
                onClick={() => setColourKey(c.key)}
                className={`h-11 w-11 rounded-full border-2 ${c.key === colourKey ? "border-brand ring-2 ring-brand-soft" : "border-line"}`}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
          <p className="mb-2 mt-4 text-sm text-muted">Size</p>
          <div className="grid grid-cols-6 gap-2">
            {product.sizes.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={s === size}
                onClick={() => setSize(s)}
                className={`h-11 rounded-xl border text-sm font-semibold ${s === size ? "border-ink bg-ink text-white" : "border-line bg-white"}`}
              >
                {s}
              </button>
            ))}
          </div>
        </Step>

        <Step n={2} title="Add your photo">
          {!consented ? (
            <UploadNotice aiEnabled={flags.aiRestyleClient} onAccept={() => setConsented(true)} />
          ) : (
            <label className="flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line bg-white text-sm font-semibold hover:border-brand">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M12 16V4m0 0-4 4m4-4 4 4M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {photo ? "Choose a different photo" : "Upload a photo"}
              <input
                ref={fileInput}
                type="file"
                accept={ACCEPTED.join(",")}
                className="sr-only"
                onChange={(e) => onFile(e.target.files?.[0])}
              />
            </label>
          )}
        </Step>

        {flags.aiRestyleClient && (
          <Step n={3} title="Restyle with AI" optional>
            {!photo ? (
              <p className="text-sm text-muted">Add a photo first, then turn it into a cartoon, line art, pop art and more.</p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {STYLES.map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      disabled={busy}
                      aria-pressed={s.key === style}
                      onClick={() => chooseStyle(s.key)}
                      className={`rounded-xl border p-3 text-left disabled:opacity-60 ${s.key === style ? "border-brand bg-brand-soft" : "border-line bg-white"}`}
                    >
                      <span className="block text-sm font-semibold">{restyling === s.key ? "Working…" : s.label}</span>
                      <span className="block text-xs text-muted">{s.hint}</span>
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted">
                  AI results vary, so check the preview before you add it to your cart. {aiNote}
                </p>
              </>
            )}
          </Step>
        )}

        {dpi !== null && dpi < DPI_WARN && (
          <p className={`rounded-xl p-3 text-sm ${dpi < DPI_POOR ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-900"}`}>
            {dpi < DPI_POOR
              ? `At this size your photo will print blurry (${dpi} DPI). Make it smaller on the shirt or use a larger photo.`
              : `At this size your photo may print a little soft (${dpi} DPI). Smaller looks sharper.`}
          </p>
        )}

        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          {status === "added" ? (
            <>
              <p className="flex-1 text-sm font-semibold text-green-800">Added to your cart</p>
              <button type="button" onClick={startOver} className="h-12 rounded-full border border-line px-4 text-sm font-semibold">
                Design another
              </button>
              <Link href="/cart" className="flex h-12 items-center rounded-full bg-ink px-5 text-sm font-semibold text-white">
                Go to cart
              </Link>
            </>
          ) : (
            <>
              <div className="flex-1 leading-tight">
                <p className="font-bold">{formatRM(product.price_sen)}</p>
                <p className="text-xs text-muted">
                  {colour.name} · {size ?? "choose a size"}
                </p>
              </div>
              <button
                type="button"
                onClick={onAddToCart}
                disabled={busy}
                className="h-12 rounded-full bg-brand px-6 font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
              >
                {status === "saving" ? "Saving…" : "Add to cart"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Step({ n, title, optional, children }: { n: number; title: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-4">
      <h2 className="mb-3 flex items-center gap-2 font-semibold">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-xs font-bold text-white">{n}</span>
        {title}
        {optional && <span className="text-xs font-normal text-muted">optional</span>}
      </h2>
      {children}
    </section>
  );
}
