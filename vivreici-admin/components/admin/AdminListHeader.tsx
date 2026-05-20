"use client"

type AdminListHeaderProps = {
  columns: string[]
  className?: string
}

export default function AdminListHeader({
  columns,
  className = "",
}: AdminListHeaderProps) {
  return (
    <div
      className={`mb-4 hidden gap-4 px-2 text-[11px] uppercase tracking-[0.24em] text-[#6B7280] xl:grid ${className}`.trim()}
    >
      {columns.map((column) => (
        <span key={column}>{column}</span>
      ))}
    </div>
  )
}
