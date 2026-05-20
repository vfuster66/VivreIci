/**
 * Marque typographique : « Vivre » en rouge (accent), « Ici » en jaune (primary).
 * `onPrimary` : pour fond jaune (bouton CTA) — « Ici » en ton foncé lisible tout en restant chaud.
 */
export function BrandedName({
  className,
  variant = "default",
}: {
  className?: string
  variant?: "default" | "onPrimary"
}) {
  const rootClass = ["font-bold", className].filter(Boolean).join(" ")

  if (variant === "onPrimary") {
    return (
      <span className={rootClass} translate="no">
        <span className="text-accent">Vivre</span>
        <span className="text-yellow-950">Ici</span>
      </span>
    )
  }
  return (
    <span className={rootClass} translate="no">
      <span className="text-accent">Vivre</span>
      <span className="text-primary">Ici</span>
    </span>
  )
}
