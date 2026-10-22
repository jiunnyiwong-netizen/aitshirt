# Your Photo Tee

Customers upload a photo, place it on a shirt, and pay with card or FPX. Your partner prints from the admin page.

Next.js (App Router) · Supabase · Stripe Checkout · Resend · Vercel

## Set up once

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in the Supabase keys
   (Supabase → Project settings → API). `NEXT_PUBLIC_SITE_URL` stays `http://localhost:3000` locally.
3. In the Supabase SQL editor, run `supabase/migrations/0001_init.sql`, then `0002_cleanup.sql`, then `supabase/seed.sql`.
4. `npm run dev` and open http://localhost:3000. On your phone, use your computer's network address
   (for example `http://192.168.1.20:3000`) while on the same Wi-Fi.

## How to test each step

### 1. Product page and designer
- The home page lists 3 shirts. Open one.
- Tick the photo notice, upload a photo, then drag, pinch (on a phone) or use the corner handles and the − + ⟲ ⟳ buttons.
  The dashed box is the A3 print area; anything outside it is faded and won't print.
- Make a small photo very big: a blurry-print warning appears.
- Pick a size and press **Add to cart**. In Supabase → Storage → `designs` you should see a folder with
  `original`, `preview.png` and `print.png`. Download `print.png`: it is 3508 × 4961 px at 300 DPI.

### 2. Cart and checkout
- Add `STRIPE_SECRET_KEY` (test mode key, starts `sk_test_`). Turn on **Cards** and **FPX** in Stripe → Settings → Payment methods.
- Open the cart, change quantities, press **Checkout**. On the Stripe page choose a shipping option.
- Pay with test card `4242 4242 4242 4242`, any future date, any CVC. For FPX, choose any bank and approve on the test page.

### 3. Order saving and emails
- Install the [Stripe CLI](https://docs.stripe.com/stripe-cli) and run
  `stripe listen --forward-to localhost:3000/api/webhooks/stripe`. Put the `whsec_…` it prints in `STRIPE_WEBHOOK_SECRET`.
- Add `RESEND_API_KEY`, `EMAIL_FROM` (a domain verified in Resend, or `onboarding@resend.dev` for testing to your own address)
  and `ADMIN_NOTIFY_EMAIL`.
- Pay again. The order in Supabase → `orders` turns to `new`, and both emails arrive.

### 4. Admin page
- Supabase → Authentication → Users → **Add user** (email + password) for you and your partner.
- Make them admins in the SQL editor:
  `update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}' where email = 'partner@example.com';`
- Turn off public sign-ups: Authentication → Sign In / Providers → **Allow new users to sign up** off.
- Open http://localhost:3000/admin, log in, open an order, download the print file, set **Printing**, then **Shipped**
  with a tracking number. The customer gets a shipped email.

### 5. Feedback
- After paying, the thank-you page shows the feedback form. Submit it, then check **Feedback** in the admin.

### 6. Privacy cleanup
- Set `CRON_SECRET` to any long random string and run
  `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/cleanup`.
- To see it delete something, back-date a test design in SQL:
  `update designs set created_at = now() - interval '8 days' where id = '…';` then run the curl again.
- On Vercel it runs every day at 3am Malaysia time (`vercel.json`).

## Deploy (Vercel)

Import the repo in Vercel, add every variable from `.env.example` (with your live `NEXT_PUBLIC_SITE_URL`),
and add a Stripe webhook endpoint `https://<your-domain>/api/webhooks/stripe` for
`checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`
and `checkout.session.expired`.

## Phase 2: Try it on me

Not built. `FEATURE_TRYON` and `NEXT_PUBLIC_FEATURE_TRYON` stay `false`; `/api/tryon` returns 404 until then.
