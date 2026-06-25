// Read-only star rating (rounded to the nearest half is overkill here — we show
// filled stars up to the rounded average).
export function Stars({ value, count }: { value: number; count?: number }) {
  const rounded = Math.round(value);
  return (
    <span className="stars" title={value ? value.toFixed(1) : undefined}>
      <span className="stars-on" aria-hidden="true">
        {"★".repeat(rounded)}
        <span className="stars-off">{"★".repeat(5 - rounded)}</span>
      </span>
      {count !== undefined && <span className="stars-count">{value ? value.toFixed(1) : "—"} ({count})</span>}
    </span>
  );
}
