// A titled card on a listing page. `plain` drops the card chrome for content
// that draws its own (a post list, a card grid).
export function Section({
  title,
  icon,
  id,
  plain = false,
  className,
  children,
}: {
  title?: React.ReactNode;
  icon?: string;
  id?: string;
  plain?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={`${plain ? "listing-plain" : "card card-pad"} listing-section${className ? ` ${className}` : ""}`}>
      {title && (
        <h2 className="listing-section-title">
          {icon && <span aria-hidden="true">{icon} </span>}
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}
