"use client"

type AdminPanelProps = {
  children: React.ReactNode
  tone?: "default" | "soft"
  className?: string
}

export default function AdminPanel({
  children,
  tone = "default",
  className = "",
}: AdminPanelProps) {
  const toneClasses =
    tone === "soft"
      ? "border-[#0337AA]/8 bg-[linear-gradient(180deg,#ffffff_0%,#f4f8ff_100%)]"
      : "border-[#0337AA]/8 bg-white"

  return (
    <section
      className={`rounded-[32px] border p-6 shadow-[0_18px_48px_rgba(3,55,170,0.08)] ${toneClasses} ${className}`.trim()}
    >
      {children}
    </section>
  )
}
