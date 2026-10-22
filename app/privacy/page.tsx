export const metadata = { title: "Privacy notice" };

export default function Privacy() {
  return (
    <article className="prose mx-auto max-w-2xl space-y-4 text-sm leading-6 text-neutral-700">
      <h1 className="text-xl font-bold text-neutral-900">Privacy notice</h1>
      <p>
        This notice explains how we handle your personal data under Malaysia&apos;s Personal Data Protection Act 2010.
      </p>
      <h2 className="font-semibold text-neutral-900">What we collect</h2>
      <ul className="list-disc pl-5">
        <li>The photo you upload, and the shirt design and preview we make from it.</li>
        <li>Your name, email, phone number and delivery address when you pay.</li>
        <li>Your answers to our short feedback form, if you choose to fill it in.</li>
      </ul>
      <h2 className="font-semibold text-neutral-900">How we use it</h2>
      <p>
        We use your photo only to show you a preview and to print your order. We use your contact details to process
        payment, deliver your order and send you order updates. Payments are handled by Stripe; we never see your
        card or bank details.
      </p>
      <h2 className="font-semibold text-neutral-900">Who can see it</h2>
      <p>Only you, us, and our printing partner. Your photo is stored privately and is never published or shared.</p>
      <h2 className="font-semibold text-neutral-900">How long we keep it</h2>
      <ul className="list-disc pl-5">
        <li>Photos and print files: deleted automatically 30 days after your order ships.</li>
        <li>Photos from unfinished orders: deleted automatically after 7 days.</li>
        <li>Order records: kept as required for accounting.</li>
      </ul>
      <h2 className="font-semibold text-neutral-900">Your rights</h2>
      <p>
        You can ask to see, correct or delete your data at any time by replying to your order confirmation email.
      </p>
    </article>
  );
}
