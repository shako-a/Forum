"use client";

import { useRef, useState } from "react";
import { ImageCropper } from "@/components/ImageCropper";
import { fileToDataUrl } from "@/lib/crop";
import type { Dictionary } from "@/i18n/dictionaries";

// Pick → crop to a fixed aspect → upload to Spaces, reporting the hosted URL.
// Used for ad cards, where each placement needs a specific aspect ratio.
export function CroppedUploadField({
  aspect,
  label,
  busyLabel,
  dict,
  onUploaded,
}: {
  aspect: number;
  label: string;
  busyLabel: string;
  dict: Dictionary;
  onUploaded: (url: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      setCropSrc(await fileToDataUrl(file));
    } catch {
      setError("Could not read image.");
    } finally {
      if (ref.current) ref.current.value = "";
    }
  }

  async function onCropped(blob: Blob) {
    setCropSrc(null);
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", new File([blob], "image.jpg", { type: "image/jpeg" }));
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Upload failed.");
        return;
      }
      onUploaded(data.url);
    } catch {
      setError("Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="upload-field">
      <input ref={ref} type="file" accept="image/*" hidden onChange={onFile} />
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        disabled={busy}
        onClick={() => ref.current?.click()}
      >
        ⬆ {busy ? busyLabel : label}
      </button>
      {error && <span className="field-error">{error}</span>}

      {cropSrc && (
        <ImageCropper
          src={cropSrc}
          aspect={aspect}
          dict={dict}
          onCancel={() => setCropSrc(null)}
          onDone={onCropped}
        />
      )}
    </span>
  );
}

// Aspect ratio per ad placement (matches how the cards render).
export const AD_ASPECT: Record<"TOP_PANEL" | "SIDEBAR", number> = {
  TOP_PANEL: 3 / 2,
  SIDEBAR: 5 / 4,
};
