import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { CartLink } from "@/components/CartLink";
import "./globals.css";

export const metadata: Metadata = {
  title: "Your Photo Tee",
  description: "Put your own photo on a premium t-shirt. Printed and shipped in Malaysia.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-neutral-900 antialiased">
        <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
            <Link href="/" className="font-semibold">Your Photo Tee</Link>
            <CartLink />
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-5xl px-4 py-8 text-xs text-neutral-500">
          <Link href="/privacy" className="underline">Privacy notice</Link>
        </footer>
      </body>
    </html>
  );
}
