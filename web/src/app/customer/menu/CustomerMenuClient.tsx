"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { BillReceipt } from "@/lib/bill-receipt";
import { categoryIcon, productIcon } from "@/lib/bill-receipt";
import SlowNetSplash from "@/components/SlowNetSplash";
import "./customer-menu.css";

export type MenuProduct = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  categoryId: number | null;
  categoryName: string;
};

export type MenuCategory = {
  id: number;
  name: string;
  products: MenuProduct[];
};

export type OpenOrderView = {
  id: number;
  status: string;
  statusLabel: string;
  statusClass: string;
  items: { qty: number; name: string }[];
};

export type PaymentView = {
  id: number;
  status: string;
  paymentMethod: string;
  referenceNumber: string;
  reviewNotes: string | null;
} | null;

export type BrandingView = {
  displayName: string;
  tagline: string;
  welcomeMessage: string | null;
  footerText: string | null;
  showPrices: boolean;
  fontVibe: string;
  logoUrl: string | null;
  backgroundUrl: string | null;
  backgroundColor: string | null;
  accentColor: string;
  accentDim: string;
  secondaryColor: string | null;
  menuTheme: string;
};

export type PaymentConfig = {
  telebirrNumber: string;
  telebirrName: string;
  bankName: string;
  bankAccount: string;
  bankAccountName: string;
  instructions: string;
};

type CartLine = { id: number; name: string; price: number; qty: number };

function money(n: number) {
  return `${n.toFixed(2)} ETB`;
}

export default function CustomerMenuClient({
  tableToken,
  tableNumber,
  branding,
  categories,
  openOrders,
  receipt,
  pendingPayment,
  latestPayment,
  pendingWaiter,
  waiterMessage,
  paymentConfig,
  placeOrder,
  callWaiter,
  requestBill,
  submitPayment,
}: {
  tableToken: string;
  tableNumber: string;
  branding: BrandingView;
  categories: MenuCategory[];
  openOrders: OpenOrderView[];
  receipt: BillReceipt;
  pendingPayment: PaymentView;
  latestPayment: PaymentView;
  pendingWaiter: boolean;
  waiterMessage: string | null;
  paymentConfig: PaymentConfig;
  placeOrder: (input: {
    tableToken: string;
    items: { productId: number; qty: number }[];
    notes: string;
  }) => Promise<{ ok: boolean; message: string }>;
  callWaiter: (tableToken: string) => Promise<{ ok: boolean; message: string }>;
  requestBill: (tableToken: string) => Promise<{ ok: boolean; message: string }>;
  submitPayment: (formData: FormData) => Promise<{ ok: boolean; message: string }>;
}) {
  const [cart, setCart] = useState<Record<number, CartLine>>({});
  const [notes, setNotes] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(!!pendingPayment);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [activeCat, setActiveCat] = useState(
    categories[0] ? `cat-${categories[0].id}` : ""
  );
  const [tip, setTip] = useState(0);
  const [method, setMethod] = useState<"telebirr" | "bank">("telebirr");
  const [toast, setToast] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pulse, setPulse] = useState(false);
  const [pending, startTransition] = useTransition();
  const [splashOn, setSplashOn] = useState(true);
  const [skipBrandSplash, setSkipBrandSplash] = useState(false);
  const [menuReady, setMenuReady] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMenuReady(true);
    const conn = (navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }).connection;
    const slow =
      !!conn &&
      (conn.saveData ||
        conn.effectiveType === "2g" ||
        conn.effectiveType === "slow-2g");
    if (slow) {
      setSkipBrandSplash(true);
      setSplashOn(false);
      return;
    }
    const t = setTimeout(() => setSplashOn(false), 1100);
    return () => clearTimeout(t);
  }, []);

  const styleVars = {
    ["--cm-accent" as string]: branding.accentColor,
    ["--cm-accent-dim" as string]: branding.accentDim,
    ["--cm-accent-glow" as string]: `${branding.accentColor}40`,
    ...(branding.secondaryColor
      ? { ["--cm-secondary" as string]: branding.secondaryColor }
      : {}),
    ...(branding.backgroundColor && branding.menuTheme === "custom"
      ? { ["--cm-bg" as string]: branding.backgroundColor }
      : {}),
  };

  const vibeClass =
    branding.fontVibe === "modern"
      ? "cm-vibe-modern"
      : branding.fontVibe === "warm"
        ? "cm-vibe-warm"
        : "cm-vibe-classic";

  const cartLines = useMemo(() => Object.values(cart), [cart]);
  const cartCount = cartLines.reduce((s, l) => s + l.qty, 0);
  const cartTotal = cartLines.reduce((s, l) => s + l.qty * l.price, 0);
  const grandWithTip = receipt.baseTotal + tip;
  const billTotal = receipt.grandTotal;

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2800);
  }

  function addToCart(product: MenuProduct, delta: number) {
    setCart((prev) => {
      const next = { ...prev };
      const cur = next[product.id] || {
        id: product.id,
        name: product.name,
        price: product.price,
        qty: 0,
      };
      cur.qty = Math.max(0, cur.qty + delta);
      if (cur.qty === 0) delete next[product.id];
      else next[product.id] = { ...cur };
      return next;
    });
    if (delta > 0) {
      setPulse(true);
      setTimeout(() => setPulse(false), 350);
    }
  }

  useEffect(() => {
    if (!categories.length) return;
    const sections = categories.map((c) => document.getElementById(`cat-${c.id}`)).filter(Boolean);
    if (!sections.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveCat(entry.target.id);
        }
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: 0 }
    );
    sections.forEach((s) => s && observer.observe(s));
    return () => observer.disconnect();
  }, [categories]);

  function scrollToCat(id: string) {
    setActiveCat(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function onSubmitOrder() {
    if (!cartLines.length) {
      showToast("Add items to your cart first.");
      return;
    }
    startTransition(async () => {
      const res = await placeOrder({
        tableToken,
        items: cartLines.map((l) => ({ productId: l.id, qty: l.qty })),
        notes,
      });
      showToast(res.message);
      if (res.ok) {
        setCart({});
        setNotes("");
        setCartOpen(false);
      }
    });
  }

  function onCallWaiter() {
    startTransition(async () => {
      const res = await callWaiter(tableToken);
      showToast(res.message);
      setCartOpen(false);
    });
  }

  function onRequestBillOnly() {
    startTransition(async () => {
      const res = await requestBill(tableToken);
      showToast(res.message);
      setCartOpen(false);
    });
  }

  function onBillBar() {
    if (billTotal > 0) {
      setPayOpen(true);
      return;
    }
    onCallWaiter();
  }

  function onPaySubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("tableToken", tableToken);
    fd.set("method", method);
    fd.set("tip_amount", String(tip));
    fd.set("amount", grandWithTip.toFixed(2));
    startTransition(async () => {
      const res = await submitPayment(fd);
      showToast(res.message);
      if (res.ok) setPayOpen(true);
    });
  }

  return (
    <div
      className={`cm-body ${vibeClass} ${branding.backgroundUrl ? "has-bg-image" : ""}`}
      style={styleVars}
    >
      <SlowNetSplash
        brandName={branding.displayName}
        logoUrl={branding.logoUrl}
        accent={branding.accentColor}
        ready={menuReady}
      />
      {branding.backgroundUrl && (
        <div
          className="cm-bg-layer"
          style={{ backgroundImage: `url(${branding.backgroundUrl})` }}
        />
      )}
      {splashOn && !skipBrandSplash && (
        <div
          className="cm-brand-splash"
          aria-hidden
          onAnimationEnd={(e) => {
            if (e.animationName === "cmSplashOut") setSplashOn(false);
          }}
        >
          <span>{branding.displayName}</span>
        </div>
      )}
      <div className={`cm-inner ${splashOn && !skipBrandSplash ? "cm-enter" : ""}`}>
        <header className="cm-hero">
          {branding.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.logoUrl} alt={branding.displayName} className="cm-logo" />
          )}
          <p className="cm-eyebrow">Table menu</p>
          <h1 className="cm-title">{branding.displayName}</h1>
          <span className="cm-table-pill">Table {tableNumber}</span>
          <p className="cm-tagline">{branding.tagline}</p>
          {branding.welcomeMessage && (
            <p className="cm-welcome">{branding.welcomeMessage}</p>
          )}
          {pendingWaiter && (
            <div className="cm-waiter-banner">
              {waiterMessage || "A waiter has been notified and will be with you shortly."}
            </div>
          )}
        </header>

        {categories.length > 1 && (
          <nav className="cm-cat-wrap" aria-label="Menu categories">
            <div className="cm-cat-nav">
              {categories.map((cat) => {
                const slug = `cat-${cat.id}`;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    className={`cm-cat-pill ${activeCat === slug ? "active" : ""}`}
                    onClick={() => scrollToCat(slug)}
                  >
                    <span>{categoryIcon(cat.name)}</span>
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </nav>
        )}

        <main className="cm-main">
          {openOrders.length > 0 && (
            <section className="cm-orders-panel">
              <h2 className="cm-orders-title">Your orders</h2>
              {openOrders.map((o) => (
                <div key={o.id} className="cm-order-card">
                  <div className="cm-order-top">
                    <strong style={{ fontSize: "0.85rem" }}>#{o.id}</strong>
                    <span className={`cm-status ${o.statusClass}`}>{o.statusLabel}</span>
                  </div>
                  <ul className="cm-order-items">
                    {o.items.map((it, i) => (
                      <li key={i}>
                        {it.qty}× {it.name}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          )}

          {receipt.hasOrders && (
            <section className="cm-receipt-acc">
              <button
                type="button"
                className="cm-receipt-toggle"
                aria-expanded={receiptOpen}
                onClick={() => setReceiptOpen((v) => !v)}
              >
                <span>View itemized bill</span>
                <span className="cm-receipt-total">{money(receipt.baseTotal)}</span>
              </button>
              {receiptOpen && (
                <div className="cm-receipt-paper">
                  <div className="head">
                    <strong>{branding.displayName}</strong>
                    <div className="small">
                      Table {tableNumber} ·{" "}
                      {new Date().toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                  <div className="server">
                    <span>Served by</span>
                    <strong>{receipt.serverLabel}</strong>
                  </div>
                  <table>
                    <tbody>
                      {receipt.lines.map((line, i) => (
                        <tr key={i}>
                          <td>
                            {line.qty}× {line.name}
                          </td>
                          <td>{money(line.lineTotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="cm-receipt-row">
                    <span>Subtotal</span>
                    <span>{money(receipt.subtotal)}</span>
                  </div>
                  <div className="cm-receipt-row">
                    <span>VAT ({receipt.vatRate}%)</span>
                    <span>{money(receipt.vatAmount)}</span>
                  </div>
                  <div className="cm-receipt-row">
                    <span>Service charge ({receipt.serviceRate}%)</span>
                    <span>{money(receipt.serviceAmount)}</span>
                  </div>
                  <div className="cm-receipt-row cm-receipt-grand">
                    <span>Total due</span>
                    <span>{money(receipt.baseTotal)}</span>
                  </div>
                  <p
                    style={{
                      textAlign: "center",
                      fontSize: "0.72rem",
                      color: "#888",
                      margin: "0.65rem 0 0",
                      fontStyle: "italic",
                    }}
                  >
                    {branding.footerText || "Thank you for dining with us."}
                  </p>
                </div>
              )}
            </section>
          )}

          {categories.map((cat) => (
            <section key={cat.id} className="cm-section" id={`cat-${cat.id}`}>
              <div className="cm-section-head">
                <span>{categoryIcon(cat.name)}</span>
                <h2 className="cm-section-title">{cat.name}</h2>
                <span className="cm-section-count">{cat.products.length} items</span>
              </div>
              <div className="cm-grid">
                {cat.products.map((p) => {
                  const qty = cart[p.id]?.qty || 0;
                  return (
                    <article key={p.id} className={`cm-card ${qty > 0 ? "in-cart" : ""}`}>
                      <div className="cm-card-inner">
                        <div className="cm-item-visual" aria-hidden>
                          {productIcon(p.name, cat.name)}
                        </div>
                        <div className="cm-item-body">
                          <h3 className="cm-item-name">{p.name}</h3>
                          {p.description && <p className="cm-item-desc">{p.description}</p>}
                          <div className="cm-item-footer">
                            {branding.showPrices && (
                              <span className="cm-item-price">{money(p.price)}</span>
                            )}
                            {!branding.showPrices && <span />}
                            <div>
                              <button
                                type="button"
                                className="cm-btn-add"
                                onClick={() => addToCart(p, 1)}
                              >
                                Add
                              </button>
                              <div className="cm-qty-inline">
                                <button
                                  type="button"
                                  aria-label="Less"
                                  onClick={() => addToCart(p, -1)}
                                >
                                  −
                                </button>
                                <span className="cm-qty-num">{qty}</span>
                                <button
                                  type="button"
                                  aria-label="More"
                                  onClick={() => addToCart(p, 1)}
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}

          <p className="cm-powered">
            Powered by <Link href="/">Casora</Link>
          </p>
        </main>

        <nav className="cm-bottom" aria-label="Order actions">
          <button
            type="button"
            className={`cm-cart-chip ${cartCount ? "has-items" : ""} ${pulse ? "pulse" : ""}`}
            onClick={() => setCartOpen((v) => !v)}
          >
            <span className="cm-cart-icon" aria-hidden>
              🛒
            </span>
            <span className="cm-cart-meta">
              <strong>
                {cartCount
                  ? `${cartCount} item${cartCount !== 1 ? "s" : ""}`
                  : "View cart"}
              </strong>
              <small>
                {cartCount ? `${money(cartTotal)} · Tap to review` : "Add something delicious"}
              </small>
            </span>
          </button>
          <button
            type="button"
            className={`cm-btn-bill ${billTotal > 0 ? "has-bill" : ""}`}
            onClick={onBillBar}
            disabled={pending}
          >
            {billTotal > 0 ? "Pay Bill" : "Request Waiter"}
          </button>
        </nav>

        <div
          className={`cm-backdrop ${cartOpen ? "open" : ""}`}
          onClick={() => setCartOpen(false)}
        />
        <div
          className={`cm-drawer ${cartOpen ? "open" : ""}`}
          role="dialog"
          aria-label="Your cart"
        >
          <div className="cm-handle" />
          <div className="cm-drawer-header">
            <h2>Your order</h2>
            <button
              type="button"
              className="cm-drawer-close"
              aria-label="Close"
              onClick={() => setCartOpen(false)}
            >
              ×
            </button>
          </div>
          <div className="cm-cart-items">
            {cartLines.length === 0 ? (
              <div className="cm-cart-empty">
                Your cart is empty.
                <br />
                Browse the menu and tap <strong>Add</strong>.
              </div>
            ) : (
              cartLines.map((line) => (
                <div key={line.id} className="cm-cart-line">
                  <div>
                    <div className="name">{line.name}</div>
                    <div className="price">{money(line.price)} each</div>
                  </div>
                  <div className="qty-controls">
                    <button
                      type="button"
                      onClick={() =>
                        addToCart(
                          {
                            id: line.id,
                            name: line.name,
                            price: line.price,
                            description: null,
                            categoryId: null,
                            categoryName: "",
                          },
                          -1
                        )
                      }
                    >
                      −
                    </button>
                    <span style={{ fontWeight: 700 }}>{line.qty}</span>
                    <button
                      type="button"
                      onClick={() =>
                        addToCart(
                          {
                            id: line.id,
                            name: line.name,
                            price: line.price,
                            description: null,
                            categoryId: null,
                            categoryName: "",
                          },
                          1
                        )
                      }
                    >
                      +
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="cm-cart-footer">
            <div className="cm-total-row">
              <span>Subtotal</span>
              <strong>{money(cartTotal)}</strong>
            </div>
            <textarea
              className="cm-notes"
              rows={2}
              placeholder="Allergies or special requests…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <button
              type="button"
              className="cm-submit"
              disabled={!cartCount || pending}
              onClick={onSubmitOrder}
            >
              {pending ? "Sending…" : "Send to Kitchen"}
            </button>
            {billTotal > 0 ? (
              <button type="button" className="cm-link-alt" onClick={onRequestBillOnly}>
                Request bill instead
              </button>
            ) : (
              <button type="button" className="cm-link-alt" onClick={onCallWaiter}>
                Request waiter instead
              </button>
            )}
          </div>
        </div>

        {(billTotal > 0 || pendingPayment) && (
          <>
            <div
              className={`cm-pay-backdrop ${payOpen ? "open" : ""}`}
              onClick={() => setPayOpen(false)}
            />
            <div className={`cm-pay-panel ${payOpen ? "open" : ""}`} aria-hidden={!payOpen}>
              <div className="cm-pay-inner">
                <div className="cm-pay-header">
                  <h2>Pay your bill</h2>
                  <button
                    type="button"
                    className="cm-drawer-close"
                    onClick={() => setPayOpen(false)}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>

                {receipt.hasOrders && (
                  <div className="cm-pay-receipt">
                    <div className="head">
                      <strong>{branding.displayName}</strong>
                      <span>Table {tableNumber}</span>
                    </div>
                    <div className="server">
                      <span>Served by</span>
                      <strong>{receipt.serverLabel}</strong>
                    </div>
                    <table>
                      <tbody>
                        {receipt.lines.map((line, i) => (
                          <tr key={i}>
                            <td>
                              {line.qty}× {line.name}
                            </td>
                            <td>{money(line.lineTotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="cm-pay-math">
                      <div className="cm-pay-row">
                        <span>Subtotal</span>
                        <span>{money(receipt.subtotal)}</span>
                      </div>
                      <div className="cm-pay-row">
                        <span>VAT ({receipt.vatRate}%)</span>
                        <span>{money(receipt.vatAmount)}</span>
                      </div>
                      <div className="cm-pay-row">
                        <span>Service ({receipt.serviceRate}%)</span>
                        <span>{money(receipt.serviceAmount)}</span>
                      </div>
                      <div className="cm-pay-row">
                        <span>Tip</span>
                        <span>{money(tip)}</span>
                      </div>
                      <div className="cm-pay-row cm-pay-grand">
                        <span>Total due</span>
                        <span>{money(grandWithTip)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {pendingPayment && (
                  <div className="cm-pay-status pending">
                    <strong>Payment under review</strong>
                    <p>
                      We received your {pendingPayment.paymentMethod} payment (ref{" "}
                      {pendingPayment.referenceNumber}). Staff will confirm shortly.
                    </p>
                  </div>
                )}
                {!pendingPayment && latestPayment?.status === "rejected" && (
                  <div className="cm-pay-status rejected">
                    <strong>Previous payment rejected</strong>
                    <p>
                      {latestPayment.reviewNotes ||
                        "Please submit again with a clear receipt."}
                    </p>
                  </div>
                )}

                {!pendingPayment && billTotal > 0 && (
                  <form onSubmit={onPaySubmit}>
                    <label className="cm-label">Tip your waiter (optional)</label>
                    <div className="cm-tip-presets">
                      {[0, 10, 20, 50].map((t) => (
                        <button
                          key={t}
                          type="button"
                          className={`cm-tip-btn ${tip === t ? "active" : ""}`}
                          onClick={() => setTip(t)}
                        >
                          {t === 0 ? "None" : `${t} ETB`}
                        </button>
                      ))}
                    </div>
                    <input
                      className="cm-input"
                      type="number"
                      min={0}
                      step={1}
                      value={tip}
                      onChange={(e) => setTip(Math.max(0, Number(e.target.value) || 0))}
                      placeholder="Custom tip amount"
                    />

                    {paymentConfig.instructions && (
                      <p className="cm-instructions">{paymentConfig.instructions}</p>
                    )}

                    <div className="cm-methods">
                      <button
                        type="button"
                        className={`cm-method ${method === "telebirr" ? "active" : ""}`}
                        onClick={() => setMethod("telebirr")}
                      >
                        <span style={{ fontSize: "1.5rem" }}>📱</span>
                        <div>
                          <strong>Telebirr</strong>
                          <div className="cm-method-detail">{paymentConfig.telebirrNumber}</div>
                          <div className="cm-method-name">{paymentConfig.telebirrName}</div>
                        </div>
                      </button>
                      <button
                        type="button"
                        className={`cm-method ${method === "bank" ? "active" : ""}`}
                        onClick={() => setMethod("bank")}
                      >
                        <span style={{ fontSize: "1.5rem" }}>🏦</span>
                        <div>
                          <strong>{paymentConfig.bankName || "Bank"}</strong>
                          <div className="cm-method-detail">{paymentConfig.bankAccount}</div>
                          <div className="cm-method-name">{paymentConfig.bankAccountName}</div>
                        </div>
                      </button>
                    </div>

                    <label className="cm-label">Transaction reference *</label>
                    <input
                      className="cm-input"
                      name="reference"
                      required
                      minLength={4}
                      maxLength={64}
                      pattern="[A-Za-z0-9\-]+"
                      placeholder="From Telebirr / bank SMS"
                    />
                    <label className="cm-label">Your phone (optional)</label>
                    <input
                      className="cm-input"
                      name="sender_phone"
                      type="tel"
                      maxLength={20}
                      placeholder="09xxxxxxxx"
                    />
                    <label className="cm-label">Payment screenshot *</label>
                    <input
                      className="cm-input"
                      name="screenshot"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      capture="environment"
                      required
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (previewUrl) URL.revokeObjectURL(previewUrl);
                        setPreviewUrl(file ? URL.createObjectURL(file) : null);
                      }}
                    />
                    <p className="cm-hint">Upload the receipt from your payment app. Max 5 MB.</p>
                    {previewUrl && (
                      <div className="cm-screenshot-preview">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={previewUrl} alt="Screenshot preview" />
                      </div>
                    )}
                    <button type="submit" className="cm-submit" disabled={pending}>
                      {pending ? "Uploading…" : "Submit payment proof"}
                    </button>
                    <p className="cm-anti-cheat">
                      Payments are verified manually. Duplicate references are blocked.
                    </p>
                  </form>
                )}
              </div>
            </div>
          </>
        )}

        <div className={`cm-toast ${toast ? "show" : ""}`} role="status">
          {toast}
        </div>
      </div>
    </div>
  );
}
