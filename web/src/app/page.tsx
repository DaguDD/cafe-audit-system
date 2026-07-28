export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

const CONTACT_PHONE = "+251954839016";
const CONTACT_EMAIL = "dagimdereje123@gmail.com";
const PHONE_TEL = "+251954839016";

async function submitLead(formData: FormData) {
  "use server";
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const phone = String(formData.get("phone") || "").trim() || null;
  const cafeName = String(formData.get("cafeName") || "").trim() || null;
  const message = String(formData.get("message") || "").trim();
  if (!name || !email || !message) {
    redirect("/?contact=err#contact");
  }
  await prisma.lead.create({
    data: { name, email, phone, cafeName, message },
  });
  redirect("/?contact=ok#contact");
}

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ contact?: string }>;
}) {
  const session = await auth();
  if (session?.user?.role === "platform_admin") redirect("/platform");
  if (session?.user?.cafeId) redirect("/dashboard");
  if (session?.user) redirect("/login?error=cafe");

  const sp = await searchParams;

  return (
    <div className="landing">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700&family=Outfit:wght@400;500;600;700&display=swap');
        .landing {
          --land-bg: #0c0a08;
          --land-surface: rgba(26, 22, 18, 0.72);
          --land-accent: #d4a574;
          --land-text: #f5f0ea;
          --land-muted: #a89f94;
          --land-font-display: "Fraunces", Georgia, serif;
          --land-font-body: "Outfit", system-ui, sans-serif;
          min-height: 100vh;
          background: var(--land-bg);
          color: var(--land-text);
          font-family: var(--land-font-body);
        }
        .landing-nav {
          position: absolute; top: 0; left: 0; right: 0; z-index: 5;
          display: flex; justify-content: space-between; align-items: center;
          padding: 1.15rem 1.5rem; max-width: 1120px; margin: 0 auto;
        }
        .landing-brand {
          display: flex; align-items: center; gap: 0.65rem;
          font-family: var(--land-font-display);
          font-weight: 700; letter-spacing: -0.02em; font-size: 1.2rem;
        }
        .landing-brand .mark {
          width: 38px; height: 38px; border-radius: 10px;
          background: rgba(212,165,116,0.16); color: var(--land-accent);
          display: grid; place-items: center; font-size: 0.95rem; font-weight: 800;
          font-family: var(--land-font-body);
        }
        .landing-nav-actions { display: flex; gap: 0.5rem; align-items: center; }
        .landing-hero {
          position: relative;
          min-height: 100vh;
          display: flex; flex-direction: column; justify-content: flex-end;
          padding: 6.5rem 1.5rem 3.5rem;
          overflow: hidden;
        }
        .landing-hero-bg {
          position: absolute; inset: 0; z-index: 0;
          background:
            linear-gradient(180deg, rgba(12,10,8,0.35) 0%, rgba(12,10,8,0.55) 45%, rgba(12,10,8,0.94) 100%),
            radial-gradient(ellipse 90% 70% at 70% 30%, rgba(212,165,116,0.22), transparent 55%),
            url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E"),
            linear-gradient(135deg, #1a1410 0%, #2a1c14 35%, #3d2818 55%, #1c120e 100%);
          background-size: cover, cover, 280px, cover;
          animation: land-breathe 14s ease-in-out infinite alternate;
        }
        .landing-hero-bg::after {
          content: "";
          position: absolute; inset: 0;
          background:
            radial-gradient(circle at 25% 70%, rgba(90,50,25,0.35), transparent 40%),
            radial-gradient(circle at 85% 20%, rgba(212,165,116,0.12), transparent 35%);
        }
        @keyframes land-breathe {
          from { transform: scale(1); }
          to { transform: scale(1.04); }
        }
        .landing-hero-inner {
          position: relative; z-index: 1;
          max-width: 1120px; margin: 0 auto; width: 100%;
        }
        .landing-hero .brand-hero {
          font-family: var(--land-font-display);
          font-size: clamp(3.4rem, 11vw, 6.5rem);
          line-height: 0.95; margin: 0 0 0.85rem;
          letter-spacing: -0.04em; font-weight: 700;
          color: var(--land-text);
          text-shadow: 0 8px 40px rgba(0,0,0,0.45);
          animation: land-brand 0.85s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .landing-hero .headline {
          font-size: clamp(1.15rem, 2.4vw, 1.45rem);
          font-weight: 500; margin: 0 0 0.55rem;
          max-width: 28rem; line-height: 1.35;
          color: #ebe4db;
          animation: land-rise 0.8s ease 0.12s both;
        }
        .landing-hero .sub {
          color: var(--land-muted); font-size: 1rem; max-width: 28rem;
          line-height: 1.55; margin: 0 0 1.6rem;
          animation: land-rise 0.8s ease 0.22s both;
        }
        .landing-cta {
          display: flex; flex-wrap: wrap; gap: 0.65rem;
          animation: land-rise 0.85s ease 0.34s both;
        }
        @keyframes land-brand {
          from { opacity: 0; transform: translateY(28px) scale(0.98); filter: blur(4px); }
          to { opacity: 1; transform: none; filter: none; }
        }
        @keyframes land-rise {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: none; }
        }
        .landing-nav {
          position: absolute; top: 0; left: 0; right: 0; z-index: 5;
          display: flex; justify-content: space-between; align-items: center;
          padding: 1.15rem 1.5rem; max-width: 1120px; margin: 0 auto;
          animation: land-fade 0.7s ease both;
        }
        @keyframes land-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .landing-section,
        .owners-band {
          animation: land-section 0.7s ease both;
          animation-timeline: view();
          animation-range: entry 8% cover 28%;
        }
        @keyframes land-section {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: none; }
        }
        @supports not (animation-timeline: view()) {
          .landing-section,
          .owners-band {
            animation: land-rise 0.9s ease both;
          }
        }
        .landing-btn {
          display: inline-flex; align-items: center; justify-content: center;
          padding: 0.75rem 1.25rem; border-radius: 10px; font-weight: 600;
          font-size: 0.95rem; border: 1px solid transparent;
          transition: transform 0.2s ease, background 0.2s ease;
        }
        .landing-btn:hover { transform: translateY(-1px); }
        .landing-btn-primary { background: var(--land-accent); color: #14100c; }
        .landing-btn-ghost {
          border-color: rgba(245,240,234,0.28); color: var(--land-text);
          backdrop-filter: blur(6px); background: rgba(12,10,8,0.25);
        }
        .landing-section {
          max-width: 1120px; margin: 0 auto; padding: 4rem 1.5rem;
        }
        .landing-section h2 {
          font-family: var(--land-font-display);
          font-size: clamp(1.7rem, 3vw, 2.15rem);
          margin: 0 0 0.5rem; letter-spacing: -0.02em;
        }
        .landing-section .lead {
          color: var(--land-muted); margin: 0 0 1.75rem; max-width: 36rem;
          line-height: 1.5;
        }
        .feature-list {
          display: grid; gap: 1.35rem 2rem;
          grid-template-columns: 1fr;
          border-top: 1px solid rgba(61,53,44,0.85);
          padding-top: 1.5rem;
        }
        @media (min-width: 720px) {
          .feature-list { grid-template-columns: 1fr 1fr; }
        }
        .feature-row h3 {
          margin: 0 0 0.35rem; font-size: 1.05rem; font-weight: 600;
        }
        .feature-row p {
          margin: 0; color: var(--land-muted); font-size: 0.92rem; line-height: 1.5;
        }
        .owners-band {
          background:
            linear-gradient(90deg, rgba(212,165,116,0.08), transparent 60%),
            #14110e;
          border-block: 1px solid #3d352c;
        }
        .owners-band .landing-section { padding-block: 3.5rem; }
        .steps {
          display: grid; gap: 1.5rem;
          counter-reset: step;
        }
        @media (min-width: 700px) { .steps { grid-template-columns: repeat(3, 1fr); gap: 2rem; } }
        .step { counter-increment: step; }
        .step .n {
          font-family: var(--land-font-display);
          color: var(--land-accent); font-size: 1.5rem; margin-bottom: 0.35rem;
        }
        .step .n::before { content: "0" counter(step); }
        .step h3 { margin: 0.15rem 0 0.35rem; font-size: 1.1rem; }
        .step p { margin: 0; color: var(--land-muted); font-size: 0.9rem; line-height: 1.45; }

        /* Ops workflow story: QR → order → kitchen → pay → audit */
        .ops-story {
          margin-top: 0.5rem;
        }
        .ops-rail {
          display: grid;
          gap: 0.85rem;
          position: relative;
        }
        @media (min-width: 800px) {
          .ops-rail {
            grid-template-columns: repeat(5, 1fr);
            gap: 0.65rem;
            align-items: stretch;
          }
          .ops-rail::before {
            content: "";
            position: absolute;
            top: 2.15rem;
            left: 8%;
            right: 8%;
            height: 1px;
            background: linear-gradient(90deg,
              transparent,
              rgba(212,165,116,0.35) 15%,
              rgba(212,165,116,0.35) 85%,
              transparent);
            pointer-events: none;
          }
        }
        .ops-step {
          position: relative;
          padding: 1rem 0.85rem 1.05rem;
          border-top: 1px solid rgba(61,53,44,0.9);
          opacity: 0;
          transform: translateY(14px);
          animation: ops-step-in 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
          animation-timeline: view();
          animation-range: entry 0% cover 32%;
        }
        .ops-step:nth-child(1) { animation-delay: 0.02s; }
        .ops-step:nth-child(2) { animation-delay: 0.1s; }
        .ops-step:nth-child(3) { animation-delay: 0.18s; }
        .ops-step:nth-child(4) { animation-delay: 0.26s; }
        .ops-step:nth-child(5) { animation-delay: 0.34s; }
        @keyframes ops-step-in {
          to { opacity: 1; transform: none; }
        }
        @supports not (animation-timeline: view()) {
          .ops-step {
            animation: ops-step-in 0.75s cubic-bezier(0.22, 1, 0.36, 1) both;
          }
        }
        .ops-icon {
          width: 44px; height: 44px; border-radius: 12px;
          display: grid; place-items: center;
          margin-bottom: 0.75rem;
          background: rgba(212,165,116,0.1);
          border: 1px solid rgba(212,165,116,0.22);
          color: var(--land-accent);
          position: relative;
          z-index: 1;
        }
        .ops-icon svg {
          width: 22px; height: 22px;
          stroke: currentColor; fill: none;
          stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round;
        }
        .ops-icon .draw {
          stroke-dasharray: 48;
          stroke-dashoffset: 48;
          animation: ops-draw 1.1s ease forwards;
          animation-timeline: view();
          animation-range: entry 10% cover 40%;
        }
        .ops-step:nth-child(1) .draw { animation-delay: 0.15s; }
        .ops-step:nth-child(2) .draw { animation-delay: 0.28s; }
        .ops-step:nth-child(3) .draw { animation-delay: 0.4s; }
        .ops-step:nth-child(4) .draw { animation-delay: 0.52s; }
        .ops-step:nth-child(5) .draw { animation-delay: 0.64s; }
        @keyframes ops-draw {
          to { stroke-dashoffset: 0; }
        }
        @supports not (animation-timeline: view()) {
          .ops-icon .draw {
            animation: ops-draw 1s ease forwards;
          }
        }
        .ops-pulse {
          animation: ops-pulse 2.8s ease-in-out infinite;
        }
        @keyframes ops-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(212,165,116,0); }
          50% { box-shadow: 0 0 0 6px rgba(212,165,116,0.12); }
        }
        .ops-label {
          font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.14em;
          color: var(--land-accent); margin: 0 0 0.35rem; font-weight: 600;
        }
        .ops-step h3 {
          margin: 0 0 0.35rem; font-size: 1.05rem; font-weight: 600;
        }
        .ops-step p {
          margin: 0; color: var(--land-muted); font-size: 0.88rem; line-height: 1.45;
        }
        .ops-flow-hint {
          margin: 1.5rem 0 0;
          font-size: 0.85rem;
          color: var(--land-muted);
          max-width: 36rem;
          line-height: 1.5;
          opacity: 0;
          animation: land-section 0.8s ease 0.2s both;
          animation-timeline: view();
          animation-range: entry 5% cover 25%;
        }
        .feature-row {
          opacity: 0;
          transform: translateY(10px);
          animation: ops-step-in 0.65s ease both;
          animation-timeline: view();
          animation-range: entry 5% cover 30%;
        }
        .feature-row:nth-child(1) { animation-delay: 0.05s; }
        .feature-row:nth-child(2) { animation-delay: 0.12s; }
        .feature-row:nth-child(3) { animation-delay: 0.19s; }
        .feature-row:nth-child(4) { animation-delay: 0.26s; }
        @supports not (animation-timeline: view()) {
          .feature-row { animation: ops-step-in 0.7s ease both; }
        }
        .step {
          opacity: 0;
          transform: translateY(12px);
          animation: ops-step-in 0.7s ease both;
          animation-timeline: view();
          animation-range: entry 5% cover 30%;
        }
        .step:nth-child(1) { animation-delay: 0.05s; }
        .step:nth-child(2) { animation-delay: 0.15s; }
        .step:nth-child(3) { animation-delay: 0.25s; }
        @supports not (animation-timeline: view()) {
          .step { animation: ops-step-in 0.7s ease both; }
        }
        .contact-grid {
          display: grid; gap: 2rem;
        }
        @media (min-width: 800px) {
          .contact-grid { grid-template-columns: 0.9fr 1.1fr; align-items: start; }
        }
        .contact-direct a {
          color: var(--land-accent); text-decoration: none; font-weight: 600;
          font-size: 1.05rem;
        }
        .contact-direct a:hover { text-decoration: underline; }
        .contact-row {
          display: flex; flex-direction: column; gap: 0.25rem;
          margin-bottom: 1.15rem;
        }
        .contact-row .label {
          font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.12em;
          color: var(--land-muted);
        }
        .contact-panel input, .contact-panel textarea {
          width: 100%; background: transparent;
          border: 0; border-bottom: 1px solid #3d352c;
          border-radius: 0; color: var(--land-text); padding: 0.7rem 0;
          font-size: 0.95rem; margin-bottom: 0.35rem;
          font-family: inherit;
        }
        .contact-panel input:focus, .contact-panel textarea:focus {
          outline: none; border-bottom-color: var(--land-accent);
        }
        .landing-footer {
          border-top: 1px solid #3d352c; padding: 1.35rem 1.5rem;
          color: var(--land-muted); font-size: 0.8rem;
          max-width: 1120px; margin: 0 auto;
          display: flex; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;
          align-items: center;
        }
        .landing-footer a { color: var(--land-muted); text-decoration: none; }
        .landing-footer a:hover { color: var(--land-text); }
        .landing-footer .platform-link {
          opacity: 0.55; font-size: 0.72rem; letter-spacing: 0.04em;
        }
      `}</style>

      <nav className="landing-nav">
        <div className="landing-brand">
          <span className="mark">C</span>
          Casora
        </div>
        <div className="landing-nav-actions">
          <Link href="/login" className="landing-btn landing-btn-ghost">
            Try demo
          </Link>
          <a href="#contact" className="landing-btn landing-btn-primary">
            Contact
          </a>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="landing-hero-bg" aria-hidden />
        <div className="landing-hero-inner">
          <h1 className="brand-hero">Casora</h1>
          <p className="headline">Cafe software that keeps stock honest and tables moving.</p>
          <p className="sub">
            We run the platform. Your cafe gets its own branded system — QR menus, kitchen tickets,
            payment proofs, and inventory that follows every sale.
          </p>
          <div className="landing-cta">
            <Link href="/login" className="landing-btn landing-btn-primary">
              Try cafe demo
            </Link>
            <a href="#contact" className="landing-btn landing-btn-ghost">
              Contact
            </a>
          </div>
        </div>
      </section>

      <section className="landing-section" id="features">
        <h2>What it does</h2>
        <p className="lead">
          One desk for floor, kitchen, and back office — built for Ethiopian cafes.
        </p>
        <div className="feature-list">
          <div className="feature-row">
            <h3>Inventory tied to recipes</h3>
            <p>Every paid order deducts ingredients. Low-stock signals keep the bar ready.</p>
          </div>
          <div className="feature-row">
            <h3>QR ordering & kitchen</h3>
            <p>Guests scan a table QR; tickets hit the line instantly with status from prep to served.</p>
          </div>
          <div className="feature-row">
            <h3>Payments you can trust</h3>
            <p>Cash per order ticket or pay-all. Guests upload Telebirr proofs; staff approve before clearing.</p>
          </div>
          <div className="feature-row">
            <h3>Audit & variance</h3>
            <p>Physical counts vs system qty with clear flags for managers and auditors.</p>
          </div>
        </div>
      </section>

      <section className="landing-section ops-story" id="workflow" aria-labelledby="workflow-heading">
        <h2 id="workflow-heading">The shift, end to end</h2>
        <p className="lead">
          From the table QR to stock that still matches — one continuous loop.
        </p>
        <div className="ops-rail">
          <article className="ops-step">
            <div className="ops-icon ops-pulse" aria-hidden>
              <svg viewBox="0 0 24 24">
                <rect className="draw" x="4" y="4" width="7" height="7" rx="1" />
                <rect className="draw" x="13" y="4" width="7" height="7" rx="1" />
                <rect className="draw" x="4" y="13" width="7" height="7" rx="1" />
                <path className="draw" d="M14 14h2v2h-2zm3 0h3v1h-3zm0 3h3v3h-3zm-3 0h2v3h-2z" />
              </svg>
            </div>
            <p className="ops-label">01 · Guest</p>
            <h3>Scan QR</h3>
            <p>Table token opens your branded menu — no app install.</p>
          </article>
          <article className="ops-step">
            <div className="ops-icon" aria-hidden>
              <svg viewBox="0 0 24 24">
                <path className="draw" d="M4 6h16M4 12h10M4 18h14" />
                <circle className="draw" cx="18" cy="12" r="2.5" />
              </svg>
            </div>
            <p className="ops-label">02 · Order</p>
            <h3>Order at table</h3>
            <p>Guests build a cart and send it straight to the kitchen.</p>
          </article>
          <article className="ops-step">
            <div className="ops-icon" aria-hidden>
              <svg viewBox="0 0 24 24">
                <path className="draw" d="M5 9h14v9a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9z" />
                <path className="draw" d="M8 9V7a4 4 0 0 1 8 0v2" />
                <path className="draw" d="M9 14h6" />
              </svg>
            </div>
            <p className="ops-label">03 · Kitchen</p>
            <h3>Ticket on the line</h3>
            <p>Prep → ready → served, with live status for the floor.</p>
          </article>
          <article className="ops-step">
            <div className="ops-icon" aria-hidden>
              <svg viewBox="0 0 24 24">
                <rect className="draw" x="3" y="6" width="18" height="12" rx="2" />
                <path className="draw" d="M3 10h18" />
                <path className="draw" d="M7 15h4" />
              </svg>
            </div>
            <p className="ops-label">04 · Pay</p>
            <h3>Pay & verify</h3>
            <p>Telebirr or bank proof uploads; staff approve before clearing.</p>
          </article>
          <article className="ops-step">
            <div className="ops-icon" aria-hidden>
              <svg viewBox="0 0 24 24">
                <path className="draw" d="M4 19V5M4 19h16" />
                <path className="draw" d="M8 15v-4M12 15V8M16 15v-6" />
              </svg>
            </div>
            <p className="ops-label">05 · Audit</p>
            <h3>Stock stays honest</h3>
            <p>Recipes deduct inventory; counts flag variance for managers.</p>
          </article>
        </div>
        <p className="ops-flow-hint">
          Each sale writes through to inventory — so the evening count is about the floor,
          not a spreadsheet guess.
        </p>
      </section>

      <div className="owners-band" id="owners">
        <section className="landing-section">
          <h2>For cafe owners</h2>
          <p className="lead">
            Casora is the platform we operate. Each cafe gets a dedicated workspace, staff logins,
            branded guest menu, and QR sheets — not a shared generic storefront.
          </p>
          <div className="feature-list">
            <div className="feature-row">
              <h3>Your brand on the guest phone</h3>
              <p>Logo, colors, welcome message, and footer — guests feel your cafe, not ours.</p>
            </div>
            <div className="feature-row">
              <h3>Roles that match the floor</h3>
              <p>Managers, waiters, kitchen, cashiers, and auditors each see the right tools.</p>
            </div>
          </div>
        </section>
      </div>

      <section className="landing-section" id="how">
        <h2>How it works</h2>
        <p className="lead">From first hello to a live cafe desk.</p>
        <div className="steps">
          <div className="step">
            <div className="n" />
            <h3>Try the demo</h3>
            <p>Sign in as manager / admin123 and walk ordering, kitchen, and payments.</p>
          </div>
          <div className="step">
            <div className="n" />
            <h3>Tell us about your cafe</h3>
            <p>Call, email, or leave a note — tables, staff, Telebirr details.</p>
          </div>
          <div className="step">
            <div className="n" />
            <h3>We provision your system</h3>
            <p>Dedicated cafe workspace, admin login, and a QR sheet for every table.</p>
          </div>
        </div>
      </section>

      <section className="landing-section" id="contact">
        <h2>Contact</h2>
        <p className="lead">Ready for your own cafe system? Reach us directly or leave a note.</p>
        {sp.contact === "ok" && (
          <div className="cas-alert cas-alert-success" style={{ maxWidth: 560, marginBottom: "1.25rem" }}>
            Thanks — we received your message and will be in touch.
          </div>
        )}
        {sp.contact === "err" && (
          <div className="cas-alert cas-alert-warning" style={{ maxWidth: 560, marginBottom: "1.25rem" }}>
            Please fill in name, email, and message.
          </div>
        )}
        <div className="contact-grid">
          <div className="contact-direct">
            <div className="contact-row">
              <span className="label">Phone</span>
              <a href={`tel:${PHONE_TEL}`}>{CONTACT_PHONE}</a>
            </div>
            <div className="contact-row">
              <span className="label">Email</span>
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            </div>
            <p style={{ color: "var(--land-muted)", fontSize: "0.9rem", margin: 0, lineHeight: 1.5 }}>
              Prefer a quick chat? Call or email — we&apos;ll get Casora running for your cafe.
            </p>
          </div>
          <div className="contact-panel">
            <form action={submitLead}>
              <input name="name" placeholder="Your name" required />
              <input name="email" type="email" placeholder="Email" required />
              <input name="phone" placeholder="Phone (optional)" />
              <input name="cafeName" placeholder="Cafe name (optional)" />
              <textarea name="message" rows={4} placeholder="How can we help?" required />
              <button
                type="submit"
                className="landing-btn landing-btn-primary"
                style={{ marginTop: "1rem" }}
              >
                Send message
              </button>
            </form>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <span>© {new Date().getFullYear()} Casora</span>
        <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap", alignItems: "center" }}>
          <Link href="/login">Try cafe demo</Link>
          <Link href="/platform/login" className="platform-link">
            Platform
          </Link>
        </div>
      </footer>
    </div>
  );
}
