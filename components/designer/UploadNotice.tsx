"use client";

import Link from "next/link";
import { useState } from "react";

// PDPA notice shown before the customer can pick a photo.
export function UploadNotice({ aiEnabled, onAccept }: { aiEnabled: boolean; onAccept: () => void }) {
  const [checked, setChecked] = useState(false);
  return (
    <div className="space-y-3 text-sm text-muted">
      <p className="font-semibold text-ink">Before you upload</p>
      <ul className="list-disc space-y-1 pl-5">
        <li>We use your photo only to preview and print your order.</li>
        {aiEnabled && (
          <li>If you choose an AI style, your photo is sent to Google&apos;s Gemini service to create it. Nothing is sent unless you tap a style.</li>
        )}
        <li>It is stored privately. Only you and our printing partner can see it.</li>
        <li>We delete it 30 days after your order ships, or after 7 days if you don&apos;t complete payment.</li>
      </ul>
      <p>
        Read the full <Link href="/privacy" className="underline">privacy notice</Link>.
      </p>
      <label className="flex items-start gap-2 text-ink">
        <input type="checkbox" className="mt-0.5 h-5 w-5 accent-[#f0532d]" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
        <span>I agree to my photo being used this way, and I have the right to use it.</span>
      </label>
      <button
        type="button"
        disabled={!checked}
        onClick={onAccept}
        className="h-12 w-full rounded-full bg-ink font-semibold text-white disabled:opacity-40"
      >
        Continue to upload
      </button>
    </div>
  );
}
