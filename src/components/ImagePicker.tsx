"use client";

import { useRef, useState } from "react";
import type { Dictionary } from "@/i18n/dictionaries";
import { ImageCropper, type AspectOption } from "@/components/ImageCropper";
import { fileToDataUrl } from "@/lib/crop";

// Default crop presets for post/reply images (feed-friendly).
const POST_ASPECTS: AspectOption[] = [
  { label: "16:9", value: 16 / 9 },
  { label: "4:3", value: 4 / 3 },
  { label: "1:1", value: 1 },
  { label: "4:5", value: 4 / 5 },
];

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.readAsDataURL(blob);
  });
}

// Upload the cropped blob to Spaces; fall back to an embedded data URL if uploads
// aren't configured/available, so posting always works.
async function uploadBlob(blob: Blob): Promise<string> {
  try {
    const fd = new FormData();
    fd.append("file", new File([blob], "image.jpg", { type: "image/jpeg" }));
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    if (res.ok) {
      const data = await res.json();
      if (data?.url) return data.url as string;
    }
  } catch {
    /* fall through to data URL */
  }
  return blobToDataUrl(blob);
}

// Controlled image field: `value` is the (data/hosted) URL, `onChange` sets it.
// Picking a file opens a crop modal before upload.
export function ImagePicker({
  value,
  onChange,
  dict,
  aspect = 16 / 9,
  aspectOptions = POST_ASPECTS,
}: {
  value: string;
  onChange: (v: string) => void;
  dict: Dictionary;
  aspect?: number;
  aspectOptions?: AspectOption[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setCropSrc(await fileToDataUrl(file));
    } catch {
      /* unsupported/broken image — ignore */
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function onCropped(blob: Blob) {
    setCropSrc(null);
    setBusy(true);
    try {
      onChange(await uploadBlob(blob));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="image-picker">
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={onFile} />
      {value ? (
        <div className="image-picker-preview">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" />
          <button type="button" className="action" onClick={() => onChange("")}>
            ✕ {dict.post.removeImage}
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="btn btn-ghost"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          🖼 {busy ? "…" : dict.post.addImage}
        </button>
      )}

      {cropSrc && (
        <ImageCropper
          src={cropSrc}
          aspect={aspect}
          aspectOptions={aspectOptions}
          dict={dict}
          onCancel={() => setCropSrc(null)}
          onDone={onCropped}
        />
      )}
    </div>
  );
}
