"use client";

import { useTransition } from "react";

// Generic confirm-then-run button for bound server actions ( () => Promise<void> ).
export function ConfirmButton({
  action,
  label,
  confirmText,
  className = "action",
}: {
  action: () => Promise<void>;
  label: string;
  confirmText: string;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className={className}
      disabled={pending}
      onClick={() => {
        if (window.confirm(confirmText)) startTransition(() => void action());
      }}
    >
      {label}
    </button>
  );
}
