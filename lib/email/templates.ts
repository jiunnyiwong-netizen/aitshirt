import { formatRM } from "@/lib/money";

export type EmailOrder = {
  order_number: number;
  customer_name: string | null;
  email: string | null;
  phone: string | null;
  subtotal_sen: number;
  shipping_sen: number;
  total_sen: number;
  shipping_address: { line1?: string | null; line2?: string | null; city?: string | null; postal_code?: string | null; state?: string | null } | null;
  items: { product_name: string; colour: string; size: string; quantity: number; unit_price_sen: number }[];
};

const esc = (s: string | null | undefined) =>
  (s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function itemsTable(o: EmailOrder) {
  const rows = o.items
    .map(
      (i) => `<tr><td style="padding:6px 0">${esc(i.product_name)} · ${esc(i.colour)} · ${esc(i.size)} × ${i.quantity}</td>
<td style="padding:6px 0;text-align:right">${formatRM(i.unit_price_sen * i.quantity)}</td></tr>`,
    )
    .join("");
  return `<table style="width:100%;border-collapse:collapse;font-size:14px">${rows}
<tr><td style="padding:6px 0;border-top:1px solid #ddd">Shipping</td><td style="padding:6px 0;border-top:1px solid #ddd;text-align:right">${formatRM(o.shipping_sen)}</td></tr>
<tr><td style="padding:6px 0;font-weight:bold">Total</td><td style="padding:6px 0;text-align:right;font-weight:bold">${formatRM(o.total_sen)}</td></tr></table>`;
}

function address(o: EmailOrder) {
  const a = o.shipping_address;
  if (!a) return "";
  return [a.line1, a.line2, [a.postal_code, a.city].filter(Boolean).join(" "), a.state].filter(Boolean).map(esc).join("<br>");
}

const wrap = (body: string) =>
  `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#171717;line-height:1.5">${body}</div>`;

export function orderConfirmationEmail(o: EmailOrder) {
  return {
    subject: `Order #${o.order_number} confirmed`,
    html: wrap(`
<h1 style="font-size:20px">Thanks${o.customer_name ? `, ${esc(o.customer_name.split(" ")[0])}` : ""}! Your order is confirmed.</h1>
<p>Order <strong>#${o.order_number}</strong>. We'll print your shirt and email you the tracking number when it ships.</p>
${itemsTable(o)}
<p style="margin-top:16px"><strong>Delivering to</strong><br>${address(o)}</p>
<p style="font-size:12px;color:#666;margin-top:24px">Your photo is used only to print this order and is deleted 30 days after it ships.
Reply to this email if you have any questions.</p>`),
  };
}

export function newOrderAlertEmail(o: EmailOrder, adminUrl: string) {
  return {
    subject: `New order #${o.order_number} · ${formatRM(o.total_sen)}`,
    html: wrap(`
<h1 style="font-size:18px">New order #${o.order_number}</h1>
${itemsTable(o)}
<p><strong>${esc(o.customer_name)}</strong><br>${esc(o.phone)}<br>${esc(o.email)}<br>${address(o)}</p>
<p><a href="${adminUrl}">Open the order and download the print files</a></p>`),
  };
}

export function shippedEmail(o: EmailOrder & { courier: string | null; tracking_number: string | null }) {
  return {
    subject: `Order #${o.order_number} is on its way`,
    html: wrap(`
<h1 style="font-size:20px">Your shirt is on its way!</h1>
<p>Order <strong>#${o.order_number}</strong> has shipped${o.courier ? ` with ${esc(o.courier)}` : ""}.</p>
${o.tracking_number ? `<p>Tracking number: <strong>${esc(o.tracking_number)}</strong></p>` : ""}
<p style="font-size:12px;color:#666;margin-top:24px">Your photo and print files will be deleted 30 days from today.</p>`),
  };
}
