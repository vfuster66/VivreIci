type VivreIciMarkProps = {
  className?: string
  /** Sur fond sombre (footer) : « Vivre » en bleu clair lisible. */
  variant?: "default" | "onDark"
}

/**
 * Marque écrite : « Vivre » en bleu, « Ici » en jaune (charte).
 */
export function VivreIciMark({ className = "", variant = "default" }: VivreIciMarkProps) {
  const vivreClass = variant === "onDark" ? "text-sky-400" : "text-primary"
  return (
    <span className={`whitespace-nowrap ${className}`.trim()}>
      <span className={vivreClass}>Vivre</span>
      <span className="text-secondary">Ici</span>
    </span>
  )
}
