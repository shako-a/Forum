// "Similar listings" — a titled grid of the module's own cards.
export function SimilarGrid({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="listing-similar" aria-label={title}>
      <h2 className="listing-section-title">🔎 {title}</h2>
      <div className="mk-grid">{children}</div>
    </section>
  );
}
