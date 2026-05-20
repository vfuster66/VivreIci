"use client"

type AdminInsetPanelProps = {
  children: React.ReactNode
  className?: string
}

export default function AdminInsetPanel({
  children,
  className = "",
}: AdminInsetPanelProps) {
  return (
    <div
      className={`rounded-[24px] bg-[#F8FBFF] px-4 py-4 text-sm text-[#5B6572] ${className}`.trim()}
    >
      {children}
    </div>
  )
}
