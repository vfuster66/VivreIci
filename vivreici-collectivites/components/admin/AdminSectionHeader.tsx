"use client"

type AdminSectionHeaderProps = {
  eyebrow?: string
  title: string
  description?: string
  action?: React.ReactNode
  titleTone?: "default" | "primary" | "inverse"
}

export default function AdminSectionHeader({
  eyebrow,
  title,
  description,
  action,
  titleTone = "default",
}: AdminSectionHeaderProps) {
  const titleClass =
    titleTone === "primary"
      ? "text-[#0337AA]"
      : titleTone === "inverse"
        ? "text-white"
        : "text-[#18212B]"

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div>
        {eyebrow ? (
          <p className="text-xs uppercase tracking-[0.28em] text-[#5B6572]">
            {eyebrow}
          </p>
        ) : null}
        <h2 className={`mt-2 text-xl font-semibold ${titleClass}`}>{title}</h2>
        {description ? (
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5B6572]">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  )
}
