// Label / value rows — "Delivery — yes", "Mileage — 42,000 mi". The value
// sits at the right edge like the reference design, and wraps under the
// label on a phone.
export function SpecTable({ rows }: { rows: Array<[React.ReactNode, React.ReactNode]> }) {
  if (rows.length === 0) return null;
  return (
    <dl className="spec-table">
      {rows.map(([k, v], i) => (
        <div key={i} className="spec-row">
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}
