export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

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
  if (session?.user) redirect("/dashboard");

  const sp = await searchParams;

  return (
    <div className="landing">
      <style>{`
        .landing {
          --land-bg: #0e0c0a;
          --land-surface: #1a1612;
          --land-accent: #e8954a;
          --land-text: #f5f0ea;
          --land-muted: #a89f94;
          min-height: 100vh;
          background:
            radial-gradient(ellipse 80% 50% at 70% 0%, rgba(232,149,74,0.14), transparent 55%),
            linear-gradient(180deg, #12100e 0%, #0a0908 100%);
          color: var(--land-text);
        }
        .landing-nav {
          display: flex; justify-content: space-between; align-items: center;
          padding: 1.1rem 1.5rem; max-width: 1100px; margin: 0 auto;
        }
        .landing-brand {
          display: flex; align-items: center; gap: 0.7rem;
          font-weight: 700; letter-spacing: -0.02em; font-size: 1.15rem;
        }
        .landing-brand .mark {
          width: 40px; height: 40px; border-radius: 10px;
          background: rgba(232,149,74,0.16); color: var(--land-accent);
          display: grid; place-items: center; font-size: 0.75rem;
        }
        .landing-nav-actions { display: flex; gap: 0.5rem; align-items: center; }
        .landing-hero {
          max-width: 1100px; margin: 0 auto;
          padding: 3.5rem 1.5rem 4rem;
          display: grid; gap: 2rem;
          min-height: calc(100vh - 72px);
          align-content: center;
        }
        @media (min-width: 900px) {
          .landing-hero {
            grid-template-columns: 1.1fr 0.9fr;
            align-items: center;
          }
        }
        .landing-hero h1 {
          font-size: clamp(2.4rem, 5vw, 3.6rem);
          line-height: 1.05; margin: 0.4rem 0 0.85rem;
          letter-spacing: -0.03em; font-weight: 700;
        }
        .landing-hero .eyebrow {
          color: var(--land-accent); text-transform: uppercase;
          letter-spacing: 0.14em; font-size: 0.72rem; margin: 0;
        }
        .landing-hero .sub {
          color: var(--land-muted); font-size: 1.05rem; max-width: 34rem;
          line-height: 1.55; margin: 0 0 1.5rem;
        }
        .landing-cta { display: flex; flex-wrap: wrap; gap: 0.65rem; }
        .landing-btn {
          display: inline-flex; align-items: center; justify-content: center;
          padding: 0.7rem 1.15rem; border-radius: 10px; font-weight: 600;
          font-size: 0.95rem; border: 1px solid transparent;
        }
        .landing-btn-primary { background: var(--land-accent); color: #12100e; }
        .landing-btn-ghost { border-color: #3d352c; color: var(--land-text); }
        .landing-visual {
          border-radius: 18px; overflow: hidden;
          border: 1px solid #3d352c;
          background:
            linear-gradient(160deg, rgba(232,149,74,0.2), transparent 40%),
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Ccircle cx='60' cy='60' r='28' fill='none' stroke='%23e8954a' stroke-opacity='0.25' stroke-width='2'/%3E%3Ccircle cx='60' cy='60' r='12' fill='%23e8954a' fill-opacity='0.35'/%3E%3C/svg%3E"),
            #1a1612;
          background-size: cover, 80px 80px, auto;
          min-height: 320px;
          position: relative;
          animation: land-fade 1.1s ease both;
        }
        .landing-visual-card {
          position: absolute; inset: auto 1.25rem 1.25rem 1.25rem;
          background: rgba(18,16,14,0.88); border: 1px solid #3d352c;
          border-radius: 12px; padding: 1rem 1.1rem;
          backdrop-filter: blur(8px);
          animation: land-up 1s 0.2s ease both;
        }
        .landing-visual-card strong { display: block; font-size: 1.1rem; margin-bottom: 0.25rem; }
        .landing-visual-card span { color: var(--land-muted); font-size: 0.85rem; }
        @keyframes land-fade { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: none; } }
        @keyframes land-up { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
        .landing-section {
          max-width: 1100px; margin: 0 auto; padding: 3rem 1.5rem;
        }
        .landing-section h2 {
          font-size: 1.75rem; margin: 0 0 0.5rem; letter-spacing: -0.02em;
        }
        .landing-section .lead {
          color: var(--land-muted); margin: 0 0 1.5rem; max-width: 36rem;
        }
        .feature-grid {
          display: grid; gap: 0.85rem;
          grid-template-columns: 1fr;
        }
        @media (min-width: 700px) {
          .feature-grid { grid-template-columns: repeat(3, 1fr); }
        }
        .feature {
          background: var(--land-surface); border: 1px solid #3d352c;
          border-radius: 12px; padding: 1.15rem 1.2rem;
        }
        .feature h3 { margin: 0 0 0.4rem; font-size: 1rem; }
        .feature p { margin: 0; color: var(--land-muted); font-size: 0.9rem; line-height: 1.45; }
        .steps { display: grid; gap: 0.85rem; }
        @media (min-width: 700px) { .steps { grid-template-columns: repeat(3, 1fr); } }
        .step {
          border-left: 2px solid var(--land-accent); padding: 0.25rem 0 0.25rem 1rem;
        }
        .step .n { color: var(--land-accent); font-size: 0.75rem; letter-spacing: 0.08em; }
        .step h3 { margin: 0.2rem 0; font-size: 1.05rem; }
        .step p { margin: 0; color: var(--land-muted); font-size: 0.9rem; }
        .contact-panel {
          background: var(--land-surface); border: 1px solid #3d352c;
          border-radius: 14px; padding: 1.35rem; max-width: 560px;
        }
        .contact-panel input, .contact-panel textarea {
          width: 100%; background: #12100e; border: 1px solid #3d352c;
          border-radius: 8px; color: var(--land-text); padding: 0.55rem 0.7rem;
          font-size: 0.9rem; margin-bottom: 0.65rem;
        }
        .landing-footer {
          border-top: 1px solid #3d352c; padding: 1.25rem 1.5rem;
          color: var(--land-muted); font-size: 0.8rem;
          max-width: 1100px; margin: 0 auto;
          display: flex; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;
        }
      `}</style>

      <nav className="landing-nav">
        <div className="landing-brand">
          <span className="mark">CAS</span>
          Cafe Audit System
        </div>
        <div className="landing-nav-actions">
          <Link href="/login" className="landing-btn landing-btn-ghost">
            Sign in
          </Link>
          <a href="#contact" className="landing-btn landing-btn-primary">
            Get your cafe
          </a>
        </div>
      </nav>

      <section className="landing-hero">
        <div>
          <p className="eyebrow">Cafe operations platform</p>
          <h1>Cafe Audit System</h1>
          <p className="sub">
            Inventory that ties to recipes, QR table ordering, kitchen tickets, Telebirr payment
            verification, and stock reconciliation — one desk for floor, kitchen, and back office.
          </p>
          <div className="landing-cta">
            <Link href="/login" className="landing-btn landing-btn-primary">
              Try the demo
            </Link>
            <a href="#how" className="landing-btn landing-btn-ghost">
              How it works
            </a>
          </div>
        </div>
        <div className="landing-visual" aria-hidden>
          <div className="landing-visual-card">
            <strong>Live floor control</strong>
            <span>QR menus · kitchen queue · payment proofs · variance audits</span>
          </div>
        </div>
      </section>

      <section className="landing-section" id="features">
        <h2>What it does</h2>
        <p className="lead">Built for Ethiopian cafes that need stock honesty and faster table service.</p>
        <div className="feature-grid">
          <div className="feature">
            <h3>Inventory & recipes</h3>
            <p>Every sale deducts ingredients. Low-stock alerts keep the bar stocked.</p>
          </div>
          <div className="feature">
            <h3>QR ordering</h3>
            <p>Guests scan a table QR, order from their phone, and upload Telebirr proofs.</p>
          </div>
          <div className="feature">
            <h3>Kitchen & payments</h3>
            <p>Tickets hit the line instantly. Staff approve payment screenshots before clearing tables.</p>
          </div>
          <div className="feature">
            <h3>Audit reconciliation</h3>
            <p>Physical counts vs system qty with variance flags for managers and auditors.</p>
          </div>
          <div className="feature">
            <h3>Shifts & waste</h3>
            <p>Clock staff, log spoilage, and keep procurement purchase orders in one place.</p>
          </div>
          <div className="feature">
            <h3>Multi-cafe ready</h3>
            <p>We provision your cafe instance, train your team, and monitor health from our platform.</p>
          </div>
        </div>
      </section>

      <section className="landing-section" id="how">
        <h2>How it works</h2>
        <p className="lead">From first hello to a live cafe desk in three steps.</p>
        <div className="steps">
          <div className="step">
            <div className="n">01</div>
            <h3>Try the demo</h3>
            <p>Sign in as manager / admin123 and walk the full floor workflow.</p>
          </div>
          <div className="step">
            <div className="n">02</div>
            <h3>Tell us about your cafe</h3>
            <p>Send a short note — tables, staff size, Telebirr details.</p>
          </div>
          <div className="step">
            <div className="n">03</div>
            <h3>We provision your system</h3>
            <p>You get a dedicated cafe workspace, admin login, and QR sheet for every table.</p>
          </div>
        </div>
      </section>

      <section className="landing-section" id="contact">
        <h2>Contact us</h2>
        <p className="lead">Ready for your own cafe system? Leave a note and we will follow up.</p>
        {sp.contact === "ok" && (
          <div className="cas-alert cas-alert-success" style={{ maxWidth: 560 }}>
            Thanks — we received your message and will be in touch.
          </div>
        )}
        {sp.contact === "err" && (
          <div className="cas-alert cas-alert-warning" style={{ maxWidth: 560 }}>
            Please fill in name, email, and message.
          </div>
        )}
        <div className="contact-panel">
          <form action={submitLead}>
            <input name="name" placeholder="Your name" required />
            <input name="email" type="email" placeholder="Email" required />
            <input name="phone" placeholder="Phone (optional)" />
            <input name="cafeName" placeholder="Cafe name (optional)" />
            <textarea name="message" rows={4} placeholder="How can we help?" required />
            <button type="submit" className="landing-btn landing-btn-primary">
              Send message
            </button>
          </form>
        </div>
      </section>

      <footer className="landing-footer">
        <span>© {new Date().getFullYear()} Cafe Audit System</span>
        <Link href="/login">Staff / demo login</Link>
      </footer>
    </div>
  );
}
