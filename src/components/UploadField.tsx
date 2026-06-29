"use client";

import { useRef, useState } from "react";

// Uploads a file to /api/upload (→ DO Spaces) and reports back the public URL.
export function UploadField({
  accept,
  label,
  busyLabel,
  onUploaded,
}: {
  accept: string;
  label: string;
  busyLabel: string;
  onUploaded: (url: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
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
      if (ref.current) ref.current.value = "";
    }
  }

  return (
    <span className="upload-field">
      <input ref={ref} type="file" accept={accept} hidden onChange={onFile} />
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        disabled={busy}
        onClick={() => ref.current?.click()}
      >
        ⬆ {busy ? busyLabel : label}
      </button>
      {error && <span className="field-error">{error}</span>}
    </span>
  );
}
