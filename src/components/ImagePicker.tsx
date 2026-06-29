"use client";

import { useRef, useState } from "react";
import type { Dictionary } from "@/i18n/dictionaries";

// Downscale + re-encode so the embedded data URL stays small (no object storage
// yet — the image rides inside the post body).
const MAX_DIM = 1280;
const QUALITY = 0.82;

async function fileToResizedCanvas(file: File): Promise<HTMLCanvasElement | null> {
  const original: string = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
  const img: HTMLImageElement = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = original;
  });
  const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", QUALITY));
}

// Resize, then upload to Spaces; if uploads aren't configured/available, fall
// back to embedding the resized image as a data URL so it always works.
async function processImage(file: File): Promise<string> {
  const canvas = await fileToResizedCanvas(file);
  if (!canvas) return "";
  const blob = await canvasToBlob(canvas);
  if (blob) {
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
  }
  return canvas.toDataURL("image/jpeg", QUALITY);
}

// Controlled image field: `value` is the (data) URL, `onChange` sets it.
export function ImagePicker({
  value,
  onChange,
  dict,
}: {
  value: string;
  onChange: (v: string) => void;
  dict: Dictionary;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      onChange(await processImage(file));
    } catch {
      /* unsupported/broken image — ignore */
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
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
    </div>
  );
}
