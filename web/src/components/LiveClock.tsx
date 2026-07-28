"use client";

import { useEffect, useState } from "react";

function formatNow(timeZone?: string) {
  const opts: Intl.DateTimeFormatOptions = {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  };
  if (timeZone) opts.timeZone = timeZone;
  try {
    return new Intl.DateTimeFormat(undefined, opts).format(new Date());
  } catch {
    return new Date().toLocaleString();
  }
}

/** Live topbar clock — updates every second (V2-style). */
export default function LiveClock({
  timeZone,
  className,
}: {
  timeZone?: string;
  className?: string;
}) {
  const [label, setLabel] = useState(() => formatNow(timeZone));

  useEffect(() => {
    setLabel(formatNow(timeZone));
    const id = setInterval(() => setLabel(formatNow(timeZone)), 1000);
    return () => clearInterval(id);
  }, [timeZone]);

  return (
    <time
      className={className}
      dateTime={new Date().toISOString()}
      style={{
        fontVariantNumeric: "tabular-nums",
        fontSize: "0.78rem",
        color: "var(--text-muted)",
        whiteSpace: "nowrap",
      }}
      title={timeZone || "Local time"}
    >
      {label}
    </time>
  );
}
