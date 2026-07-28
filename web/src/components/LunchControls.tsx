"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

type Props = {
  shiftStatus: "open" | "on_lunch" | null;
  inLunchWindow: boolean;
  lunchLabel: string;
  startLunchAction: () => Promise<{ ok: boolean; message?: string }>;
  endLunchAction: () => Promise<{ ok: boolean; message?: string }>;
};

/**
 * Toast/Sling-inspired presence control: Out for lunch / Back from lunch.
 */
export default function LunchControls({
  shiftStatus,
  inLunchWindow,
  lunchLabel,
  startLunchAction,
  endLunchAction,
}: Props) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (shiftStatus === "on_lunch") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
        <span
          className="badge"
          style={{
            background: "rgba(212, 165, 116, 0.2)",
            color: "var(--accent, #d4af74)",
          }}
        >
          On lunch
        </span>
        <button
          type="button"
          className="cas-btn cas-btn-primary cas-btn-sm"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              await endLunchAction();
              router.refresh();
            });
          }}
        >
          {pending ? "…" : "Back from lunch"}
        </button>
      </div>
    );
  }

  if (shiftStatus === "open" && inLunchWindow) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
        <button
          type="button"
          className="cas-btn cas-btn-ghost cas-btn-sm"
          disabled={pending}
          title={lunchLabel}
          onClick={() => {
            startTransition(async () => {
              await startLunchAction();
              router.refresh();
            });
          }}
        >
          {pending ? "…" : "Out for lunch"}
        </button>
      </div>
    );
  }

  if (shiftStatus === "open") {
    return (
      <span className="badge" style={{ fontSize: "0.7rem" }} title="Clocked in">
        On floor
      </span>
    );
  }

  return null;
}
