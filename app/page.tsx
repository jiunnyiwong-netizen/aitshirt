import Image from "next/image";
import Link from "next/link";
import { flags } from "@/lib/flags";
import { formatRM } from "@/lib/money";
import { listProducts } from "@/lib/products";

export const revalidate = 60;

const STEPS = [
  { title: "Pick your shirt", text: "Three premium cuts, in white, black or navy, sizes S to 3XL." },
  { title: "Add your photo", text: "Upload from your phone. Turn it into a cartoon, line art or pop art with AI if you like." },
  { title: "See it, then buy", text: "Move, resize and rotate it on the shirt. What you see is what we print." },
];

const FAQ = [
  {
    q: "How long does delivery take?",
    a: "We print within 2 working days. Delivery then takes 2 to 4 working days in Peninsular Malaysia and 4 to 7 in Sabah, Sarawak and Labuan.",
  },
  { q: "How much is shipping?", a: "RM 8 to Peninsular Malaysia, RM 15 to Sabah, Sarawak and Labuan." },
  {
    q: "What photo works best?",
    a: "A sharp, well-lit photo straight from your phone camera. We warn you before you buy if your photo is too small to print sharply.",
  },
  {
    q: "What happens to my photo?",
    a: "It is used only for your order and deleted automatically 30 days after we ship, or after 7 days if you don't buy.",
  },
  { q: "How do I pay?", a: "By card or FPX online banking, through Stripe's secure checkout." },
];

export default async function Home() {
  const products = await listProducts();
  return (
    <div className="space-y-14">
      <section className="grid items-center gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <p className="inline-block rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand-dark">
            {flags.aiRestyleClient ? "New: restyle your photo with AI" : "Printed in Malaysia"}
          </p>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
            Your photo.
            <br />
            On a tee you&apos;ll actually wear.
          </h1>
          <p className="text-lg text-muted">
            Upload a photo, place it exactly where you want, and see the finished shirt before you pay.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/products/${products[0]?.slug ?? ""}`}
              className="inline-flex h-12 items-center rounded-full bg-brand px-6 font-semibold text-white hover:bg-brand-dark"
            >
              Design your tee
            </Link>
            <span className="text-sm text-muted">From {formatRM(Math.min(...products.map((p) => p.price_sen)))}</span>
          </div>
        </div>
        <Image src="/hero.png" alt="Black t-shirt with a sunset illustration printed on the front" width={800} height={800} priority className="mx-auto w-full max-w-md" />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold">How it works</h2>
        <ol className="grid gap-3 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="rounded-2xl border border-line bg-white p-5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-sm font-bold text-white">{i + 1}</span>
              <h3 className="mt-3 font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-4" id="shirts">
        <h2 className="text-2xl font-bold">Choose your shirt</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p, i) => (
            <Link key={p.id} href={`/products/${p.slug}`} className="group overflow-hidden rounded-2xl border border-line bg-white">
              <div className="flex aspect-[4/3] items-center justify-center bg-[#f3f0ea]">
                <Image
                  src={p.colours[i % p.colours.length].mockup}
                  alt={p.name}
                  width={500}
                  height={500}
                  className="h-full w-auto transition group-hover:scale-[1.03]"
                />
              </div>
              <div className="space-y-2 p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-semibold">{p.name}</h3>
                  <span className="font-semibold">{formatRM(p.price_sen)}</span>
                </div>
                {p.description && <p className="text-sm text-muted">{p.description}</p>}
                <div className="flex gap-1.5" aria-label={p.colours.map((c) => c.name).join(", ")}>
                  {p.colours.map((c) => (
                    <span key={c.key} className="h-4 w-4 rounded-full border border-line" style={{ backgroundColor: c.hex }} />
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-3 rounded-2xl bg-ink p-6 text-white sm:grid-cols-3">
        <Trust title="Pay your way" text="Card or FPX online banking, secured by Stripe." />
        <Trust title="Premium print" text="Every shirt printed to order at 300 DPI." />
        <Trust title="Your photo stays private" text="Seen only by us, and deleted after delivery." />
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold">Questions</h2>
        <div className="divide-y divide-line rounded-2xl border border-line bg-white">
          {FAQ.map((f) => (
            <details key={f.q} className="group p-4">
              <summary className="flex cursor-pointer list-none items-center justify-between font-medium">
                {f.q}
                <span className="text-muted transition group-open:rotate-45" aria-hidden>+</span>
              </summary>
              <p className="mt-2 text-sm text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}

function Trust({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <p className="font-semibold">{title}</p>
      <p className="text-sm text-white/70">{text}</p>
    </div>
  );
}
