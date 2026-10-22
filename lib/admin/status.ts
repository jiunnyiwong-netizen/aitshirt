export const STATUS_LABELS = {
  pending_payment: "Unpaid",
  new: "New",
  printing: "Printing",
  shipped: "Shipped",
  cancelled: "Cancelled",
} as const;

export type OrderStatus = keyof typeof STATUS_LABELS;

export const STATUS_STYLES: Record<OrderStatus, string> = {
  pending_payment: "bg-neutral-100 text-neutral-600",
  new: "bg-blue-100 text-blue-800",
  printing: "bg-amber-100 text-amber-900",
  shipped: "bg-green-100 text-green-800",
  cancelled: "bg-neutral-100 text-neutral-500",
};
