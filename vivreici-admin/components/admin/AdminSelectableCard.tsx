"use client"

type AdminSelectableCardProps = {
  active?: boolean
  children: React.ReactNode
  onClick?: () => void
  className?: string
}

export default function AdminSelectableCard({
  active = false,
  children,
  onClick,
  className = "",
}: AdminSelectableCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-[24px] border px-4 py-4 text-left transition ${
        active
          ? "border-[#FAC411] bg-[#FFF8DF]"
          : "border-[#0337AA]/8 bg-[#F8FBFF] hover:border-[#0337AA]/18"
      } ${className}`.trim()}
    >
      {children}
    </button>
  )
}
