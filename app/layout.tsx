import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { CartLink } from "@/components/CartLink";
import "./globals.css";

export const metadata: Metadata = {
  title: "Your Photo Tee · Custom photo t-shirts in Malaysia",
  description: "Upload a photo, restyle it with AI, and see your premium t-shirt before you buy. Printed and shipped in Malaysia.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#faf8f4",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col antialiased">
        <header className="sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
              <span className="inline-block h-6 w-6 rounded-md bg-brand" aria-hidden />
              Your Photo Tee
            </Link>
            <CartLink />
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-6">{children}</main>
        <footer className="border-t border-line">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-xs text-muted">
            <span>Printed and shipped in Malaysia</span>
            <Link href="/privacy" className="underline">Privacy notice</Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
