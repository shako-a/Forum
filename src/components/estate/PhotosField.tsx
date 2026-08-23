"use client";

import { useRef, useState } from "react";

// Multi-photo uploader for listings. Uploads via /api/upload (→ DO Spaces),
// shows reorderable thumbnails, and submits the ordered URLs as hidden
// `photos` inputs. The first photo is the hero shot.
export function PhotosField({
  defaultPhotos = [],
  max = 12,
  labels,
}: {
  defaultPhotos?: string[];
  max?: number;
  labels: { add: string; uploading: string; heroHint: string; makeHero: string; remove: string };
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<string[]>(defaultPhotos);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      for (const file of files) {
        if (photos.length >= max) break;
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) {
          setError(data?.error || "Upload failed.");
          break;
        }
        setPhotos((p) => (p.length < max ? [...p, data.url] : p));
      }
    } catch {
      setError("Upload failed.");
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  }

  function move(i: number, dir: -1 | 1) {
    setPhotos((p) => {
      const j = i + dir;
      if (j < 0 || j >= p.length) return p;
      const next = [...p];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  return (
    <div className="re-photos-field">
      {photos.map((url) => (
        <input key={url} type="hidden" name="photos" value={url} />
      ))}

      {photos.length > 0 && (
        <div className="re-photos-grid">
          {photos.map((url, i) => (
            <div key={url} className={`re-photo-thumb${i === 0 ? " is-hero" : ""}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" />
              {i === 0 && <span className="re-photo-hero-tag">★</span>}
              <span className="re-photo-tools">
                {i > 0 && (
                  <button type="button" title={labels.makeHero} onClick={() => move(i, -1)}>
                    ‹
                  </button>
                )}
                {i < photos.length - 1 && (
                  <button type="button" onClick={() => move(i, 1)}>
                    ›
                  </button>
                )}
                <button
                  type="button"
                  title={labels.remove}
                  onClick={() => setPhotos((p) => p.filter((u) => u !== url))}
                >
                  ✕
                </button>
              </span>
            </div>
          ))}
        </div>
      )}

      <input ref={ref} type="file" accept="image/*" multiple hidden onChange={onFiles} />
      <div className="re-photos-actions">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={busy || photos.length >= max}
          onClick={() => ref.current?.click()}
        >
          📷 {busy ? labels.uploading : labels.add} ({photos.length}/{max})
        </button>
        <span className="muted-sm">{labels.heroHint}</span>
      </div>
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}
