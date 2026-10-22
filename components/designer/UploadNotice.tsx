"use client";

import Link from "next/link";
import { useState } from "react";

// PDPA notice shown before the customer can pick a photo.
export function UploadNotice({ onAccept }: { onAccept: () => void }) {
  const [checked, setChecked] = useState(false);
  return (
    <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
      <p className="font-semibold text-neutral-900">Before you upload a photo</p>
      <ul className="list-disc space-y-1 pl-5">
        <li>We use your photo only to preview and print your order.</li>
        <li>It is stored privately. Only you and our printing partner can see it.</li>
        <li>We delete it 30 days after your order ships, or after 7 days if you don&apos;t complete payment.</li>
      </ul>
      <p>
        Read the full <Link href="/privacy" className="underline">privacy notice</Link>.
      </p>
      <label className="flex items-start gap-2">
        <input type="checkbox" className="mt-0.5 h-5 w-5" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
        <span>I agree to my photo being used this way, and I have the right to use it.</span>
      </label>
      <button
        type="button"
        disabled={!checked}
        onClick={onAccept}
        className="h-11 w-full rounded-lg bg-neutral-900 font-medium text-white disabled:opacity-40"
      >
        Continue to upload
      </button>
    </div>
  );
}
