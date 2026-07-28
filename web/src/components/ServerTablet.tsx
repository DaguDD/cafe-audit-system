"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Product = {
  id: number;
  name: string;
  price: number;
  category: string;
};

type Table = {
  id: number;
  tableNumber: string;
  status: string;
};

export default function ServerTablet({
  tables,
  products,
  selectedTableId,
  submitOrder,
}: {
  tables: Table[];
  products: Product[];
  selectedTableId: number | null;
  submitOrder: (payload: { tableId: number; items: { productId: number; qty: number }[] }) => Promise<void>;
}) {
  const router = useRouter();
  const [qty, setQty] = useState<Record<number, number>>({});
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const categories = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const p of products) {
      const key = p.category || "Uncategorized";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    return [...map.entries()];
  }, [products]);

  const cartTotal = products.reduce((sum, p) => sum + (qty[p.id] || 0) * p.price, 0);
  const cartCount = Object.values(qty).reduce((s, n) => s + n, 0);

  function bump(id: number, delta: number) {
    setQty((prev) => {
      const next = Math.max(0, (prev[id] || 0) + delta);
      return { ...prev, [id]: next };
    });
  }

  function onSubmit() {
    if (!selectedTableId || cartCount === 0) return;
    setError(null);
    const items = Object.entries(qty)
      .filter(([, q]) => q > 0)
      .map(([id, q]) => ({ productId: Number(id), qty: q }));
    startTransition(async () => {
      try {
        await submitOrder({ tableId: selectedTableId, items });
        setQty({});
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to submit order");
      }
    });
  }

  return (
    <div className="grid-2">
      <div className="glass-panel">
        <div className="panel-head">
          <h3>Select Table</h3>
        </div>
        <div className="panel-body" style={{ display: "grid", gap: "0.4rem" }}>
          {tables.map((t) => (
            <a
              key={t.id}
              href={`/server?table=${t.id}`}
              className="product-tile"
              style={{
                borderColor:
                  selectedTableId === t.id
                    ? "var(--accent)"
                    : t.status === "waiter_requested"
                      ? "var(--danger)"
                      : undefined,
                background: selectedTableId === t.id ? "var(--accent-dim)" : undefined,
              }}
            >
              <strong>{t.tableNumber}</strong>
              <span className="badge">{t.status.replaceAll("_", " ")}</span>
            </a>
          ))}
          {tables.length === 0 && (
            <p style={{ color: "var(--text-muted)", margin: 0 }}>No tables configured.</p>
          )}
        </div>
      </div>

      <div>
        <div className="glass-panel" style={{ marginBottom: "0.75rem" }}>
          <div className="panel-head">
            <h3>Menu</h3>
            <span className="font-mono text-accent">{cartTotal.toFixed(2)} ETB</span>
          </div>
          <div className="panel-body">
            {!selectedTableId && (
              <div className="cas-alert cas-alert-warning">Select a table to place an order.</div>
            )}
            {error && <div className="cas-alert cas-alert-warning">{error}</div>}
            {categories.map(([cat, list]) => (
              <div key={cat} style={{ marginBottom: "1rem" }}>
                <p
                  style={{
                    margin: "0 0 0.5rem",
                    fontSize: "0.7rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "var(--text-muted)",
                  }}
                >
                  {cat}
                </p>
                <div style={{ display: "grid", gap: "0.45rem" }}>
                  {list.map((p) => (
                    <div key={p.id} className="product-tile">
                      <div>
                        <strong>{p.name}</strong>
                        <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                          {p.price.toFixed(2)} ETB
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                        <button
                          type="button"
                          className="cas-btn cas-btn-ghost cas-btn-sm"
                          onClick={() => bump(p.id, -1)}
                        >
                          −
                        </button>
                        <span className="font-mono" style={{ minWidth: 18, textAlign: "center" }}>
                          {qty[p.id] || 0}
                        </span>
                        <button
                          type="button"
                          className="cas-btn cas-btn-ghost cas-btn-sm"
                          onClick={() => bump(p.id, 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <button
          type="button"
          className="cas-btn cas-btn-primary cas-btn-block"
          disabled={!selectedTableId || cartCount === 0 || pending}
          onClick={onSubmit}
        >
          {pending ? "Submitting…" : "Submit to Kitchen"}
        </button>
      </div>
    </div>
  );
}
