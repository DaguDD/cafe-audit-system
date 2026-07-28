export type BillLine = {
  qty: number;
  name: string;
  unitPrice: number;
  lineTotal: number;
  orderId: number;
};

export type BillReceipt = {
  lines: BillLine[];
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  serviceRate: number;
  serviceAmount: number;
  tipAmount: number;
  grandTotal: number;
  baseTotal: number;
  serverLabel: string;
  orderCount: number;
  hasOrders: boolean;
};

export function buildBillReceipt(input: {
  orders: {
    id: number;
    orderSource: string;
    server?: { fullName: string } | null;
    items: {
      qty: number;
      unitPrice: { toString(): string } | number;
      lineTotal: { toString(): string } | number;
      product: { name: string };
    }[];
  }[];
  vatRate?: number;
  serviceRate?: number;
  tipAmount?: number;
}): BillReceipt {
  const vatRate = Number(input.vatRate ?? 15);
  const serviceRate = Number(input.serviceRate ?? 10);
  const tipAmount = Math.max(0, Number(input.tipAmount ?? 0));
  const lines: BillLine[] = [];
  const servers = new Set<string>();
  let subtotal = 0;

  for (const order of input.orders) {
    if (order.server?.fullName) servers.add(order.server.fullName);
    for (const item of order.items) {
      const lineTotal = Number(item.lineTotal);
      lines.push({
        qty: item.qty,
        name: item.product.name,
        unitPrice: Number(item.unitPrice),
        lineTotal,
        orderId: order.id,
      });
      subtotal += lineTotal;
    }
  }

  subtotal = Math.round(subtotal * 100) / 100;
  const vatAmount = Math.round(subtotal * (vatRate / 100) * 100) / 100;
  const serviceAmount = Math.round(subtotal * (serviceRate / 100) * 100) / 100;
  const baseTotal = Math.round((subtotal + vatAmount + serviceAmount) * 100) / 100;
  const grandTotal = Math.round((baseTotal + tipAmount) * 100) / 100;

  let serverLabel = "Self-service (QR menu)";
  if (servers.size === 1) serverLabel = [...servers][0];
  else if (servers.size > 1) serverLabel = [...servers].join(", ");

  return {
    lines,
    subtotal,
    vatRate,
    vatAmount,
    serviceRate,
    serviceAmount,
    tipAmount,
    grandTotal,
    baseTotal,
    serverLabel,
    orderCount: input.orders.length,
    hasOrders: subtotal > 0,
  };
}

export function orderStatusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "committed":
      return "Kitchen received";
    case "preparing":
      return "Preparing";
    case "served":
      return "Served";
    case "paid":
      return "Paid";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

export function orderStatusClass(status: string): string {
  switch (status) {
    case "preparing":
      return "preparing";
    case "served":
      return "served";
    case "paid":
      return "paid";
    default:
      return "kitchen";
  }
}

export function categoryIcon(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("hot") || n.includes("coffee") || n.includes("tea")) return "☕";
  if (n.includes("cold") || n.includes("juice") || n.includes("drink")) return "🧊";
  if (n.includes("food") || n.includes("meal") || n.includes("sandwich")) return "🍽️";
  if (n.includes("dessert") || n.includes("sweet") || n.includes("cake")) return "🍰";
  if (n.includes("snack")) return "🥐";
  return "🍽️";
}

export function productIcon(name: string, categoryName: string): string {
  const n = name.toLowerCase();
  if (n.includes("espresso")) return "☕";
  if (n.includes("latte")) return "🥛";
  if (n.includes("cappuccino")) return "☕";
  if (n.includes("mocha") || n.includes("chocolate")) return "🍫";
  if (n.includes("croissant")) return "🥐";
  if (n.includes("iced")) return "🧊";
  return categoryIcon(categoryName);
}

/** Normalize hex; returns null if invalid. */
export function normalizeHex(color: string | null | undefined, fallback?: string): string | null {
  if (!color || !color.trim()) return fallback ?? null;
  let c = color.trim();
  if (!c.startsWith("#")) c = `#${c}`;
  if (!/^#[0-9A-Fa-f]{6}$/.test(c) && !/^#[0-9A-Fa-f]{3}$/.test(c)) return fallback ?? null;
  if (c.length === 4) {
    c = `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}`;
  }
  return c.toLowerCase();
}

export function dimAccent(hex: string): string {
  const h = normalizeHex(hex, "#d4af74")!;
  const r = parseInt(h.slice(1, 3), 16);
  const g = parseInt(h.slice(3, 5), 16);
  const b = parseInt(h.slice(5, 7), 16);
  const mix = (ch: number) => Math.round(ch * 0.72 + 0 * 0.28);
  return `#${[mix(r), mix(g), mix(b)].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}
