"use client";

import { useCallback, useState } from "react";
import Cropper from "react-easy-crop";
import { getCroppedBlob, type Area } from "@/lib/crop";
import type { Dictionary } from "@/i18n/dictionaries";

export type AspectOption = { label: string; value: number };

// Modal that lets the user pan/zoom/crop a picked image to a target aspect
// ratio, returning a downscaled JPEG blob.
export function ImageCropper({
  src,
  aspect,
  aspectOptions,
  maxDim = 1280,
  dict,
  onCancel,
  onDone,
}: {
  src: string;
  aspect: number;
  aspectOptions?: AspectOption[];
  maxDim?: number;
  dict: Dictionary;
  onCancel: () => void;
  onDone: (blob: Blob) => void;
}) {
  const t = dict.common;
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [activeAspect, setActiveAspect] = useState(aspect);
  const [area, setArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  const onCropComplete = useCallback((_a: Area, px: Area) => setArea(px), []);

  async function confirm() {
    if (!area) return;
    setBusy(true);
    try {
      const blob = await getCroppedBlob(src, area, maxDim);
      if (blob) onDone(blob);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="crop-backdrop" role="dialog" aria-modal="true" aria-label={t.cropTitle}>
      <div className="crop-modal">
        <div className="crop-stage">
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            aspect={activeAspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            restrictPosition
          />
        </div>

        <div className="crop-controls">
          {aspectOptions && aspectOptions.length > 0 && (
            <div className="crop-aspects">
              {aspectOptions.map((o) => (
                <button
                  key={o.label}
                  type="button"
                  className={`crop-aspect${Math.abs(o.value - activeAspect) < 0.001 ? " active" : ""}`}
                  onClick={() => setActiveAspect(o.value)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          )}

          <label className="crop-zoom">
            <span aria-hidden="true">🔍</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              aria-label={t.cropZoom}
            />
          </label>

          <div className="crop-actions">
            <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>
              {t.cropCancel}
            </button>
            <button type="button" className="btn btn-primary" onClick={confirm} disabled={busy || !area}>
              {busy ? "…" : t.cropApply}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
