"use client";

import { useState } from "react";

export default function PasswordField({
  name,
  required,
  autoComplete,
  placeholder,
  minLength,
  className = "cas-input",
  id,
}: {
  name: string;
  required?: boolean;
  autoComplete?: string;
  placeholder?: string;
  minLength?: number;
  className?: string;
  id?: string;
}) {
  const [show, setShow] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <input
        id={id}
        name={name}
        type={show ? "text" : "password"}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        minLength={minLength}
        className={className}
        style={{ paddingRight: "2.75rem", width: "100%" }}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? "Hide password" : "Show password"}
        style={{
          position: "absolute",
          right: 8,
          top: "50%",
          transform: "translateY(-50%)",
          border: "none",
          background: "transparent",
          color: "var(--text-muted)",
          cursor: "pointer",
          padding: "0.25rem 0.35rem",
          fontSize: "0.75rem",
          lineHeight: 1,
        }}
      >
        {show ? "Hide" : "Show"}
      </button>
    </div>
  );
}
