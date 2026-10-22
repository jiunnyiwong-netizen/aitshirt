// Flat shipping rates, offered as choices on the Stripe Checkout page.
export const SHIPPING_RATES = [
  { key: "peninsular", label: "Peninsular Malaysia", amountSen: 800, minDays: 2, maxDays: 4 },
  { key: "east", label: "Sabah, Sarawak and Labuan", amountSen: 1500, minDays: 4, maxDays: 7 },
] as const;
