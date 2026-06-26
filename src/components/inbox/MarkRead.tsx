"use client";

import { useEffect, useRef } from "react";

// Fires a bound mark-as-read server action once when mounted — but only when
// `when` is true. Guarding on `when` prevents a revalidate→remount→refire loop:
// after the action marks everything read, the next render passes when=false.
export function MarkRead({ action, when }: { action: () => Promise<void>; when: boolean }) {
  const done = useRef(false);
  useEffect(() => {
    if (!when || done.current) return;
    done.current = true;
    void action();
  }, [action, when]);
  return null;
}
