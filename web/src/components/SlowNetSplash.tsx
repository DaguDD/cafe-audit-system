"use client";

import { useEffect, useState, type CSSProperties } from "react";

type ConnectionLike = {
  saveData?: boolean;
  effectiveType?: string;
};

function isSlowConnection(): boolean {
  if (typeof navigator === "undefined") return false;
  const conn = (navigator as Navigator & { connection?: ConnectionLike }).connection;
  if (!conn) return false;
  if (conn.saveData) return true;
  const t = conn.effectiveType;
  return t === "2g" || t === "slow-2g";
}

/**
 * Lightweight branded splash for slow networks only.
 * Does not block fast users; unmounts as soon as ready or after a short cap.
 */
export default function SlowNetSplash({
  brandName,
  logoUrl,
  accent = "#d4af74",
  ready,
  slowPaintMs = 1400,
}: {
  brandName: string;
  logoUrl?: string | null;
  accent?: string;
  /** When true (menu hydrated / data ready), dismiss if already showing */
  ready?: boolean;
  slowPaintMs?: number;
}) {
  const [visible, setVisible] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (gone) return;
    let cancelled = false;
    const paintStart = performance.now();
    const knownSlow = isSlowConnection();

    const show = () => {
      if (!cancelled) setVisible(true);
    };

    let timer: ReturnType<typeof setTimeout> | null = null;
    if (knownSlow) {
      show();
    } else {
      timer = setTimeout(() => {
        if (performance.now() - paintStart >= slowPaintMs) show();
      }, slowPaintMs);
    }

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [gone, slowPaintMs]);

  useEffect(() => {
    if (!visible) return;
    if (ready) {
      const t = setTimeout(() => {
        setVisible(false);
        setGone(true);
      }, 280);
      return () => clearTimeout(t);
    }
    // Cap how long the loader can stay even if "ready" never flips
    const cap = setTimeout(() => {
      setVisible(false);
      setGone(true);
    }, 4500);
    return () => clearTimeout(cap);
  }, [visible, ready]);

  if (gone || !visible) return null;

  return (
    <div
      className="slow-net-splash"
      role="status"
      aria-live="polite"
      style={
        {
          ["--sns-accent" as string]: accent,
        } as CSSProperties
      }
    >
      <style>{`
        .slow-net-splash {
          position: fixed;
          inset: 0;
          z-index: 3000;
          display: grid;
          place-items: center;
          background: #0c0b09;
          pointer-events: none;
          animation: snsFadeIn 0.25s ease both;
        }
        .slow-net-splash.leaving {
          animation: snsFadeOut 0.28s ease forwards;
        }
        .sns-inner {
          text-align: center;
          padding: 1.5rem;
        }
        .sns-logo {
          width: 56px;
          height: 56px;
          object-fit: contain;
          border-radius: 12px;
          margin: 0 auto 0.85rem;
          display: block;
          border: 1px solid rgba(212,175,116,0.2);
          background: #161411;
        }
        .sns-mark {
          width: 56px;
          height: 56px;
          border-radius: 12px;
          margin: 0 auto 0.85rem;
          display: grid;
          place-items: center;
          font-weight: 800;
          font-size: 1.15rem;
          color: var(--sns-accent, #d4af74);
          background: rgba(212,175,116,0.12);
          border: 1px solid rgba(212,175,116,0.2);
        }
        .sns-name {
          font-family: Georgia, "Times New Roman", serif;
          font-size: 1.35rem;
          color: var(--sns-accent, #d4af74);
          letter-spacing: -0.02em;
          margin: 0 0 0.85rem;
        }
        .sns-bar {
          width: 120px;
          height: 2px;
          margin: 0 auto;
          border-radius: 2px;
          background: rgba(212,175,116,0.15);
          overflow: hidden;
        }
        .sns-bar > span {
          display: block;
          height: 100%;
          width: 40%;
          background: var(--sns-accent, #d4af74);
          animation: snsSlide 1.1s ease-in-out infinite;
        }
        .sns-hint {
          margin: 0.75rem 0 0;
          font-size: 0.72rem;
          color: #9a9288;
        }
        @keyframes snsFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes snsFadeOut {
          to { opacity: 0; visibility: hidden; }
        }
        @keyframes snsSlide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(280%); }
        }
      `}</style>
      <div className="sns-inner">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" className="sns-logo" />
        ) : (
          <div className="sns-mark" aria-hidden>
            {brandName.charAt(0).toUpperCase()}
          </div>
        )}
        <p className="sns-name">{brandName}</p>
        <div className="sns-bar" aria-hidden>
          <span />
        </div>
        <p className="sns-hint">Loading menu…</p>
      </div>
    </div>
  );
}
