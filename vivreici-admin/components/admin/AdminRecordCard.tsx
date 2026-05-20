"use client"

type AdminRecordCardProps = {
  children: React.ReactNode
  className?: string
}

export default function AdminRecordCard({
  children,
  className = "",
}: AdminRecordCardProps) {
  return (
    <article
      className={`rounded-[24px] border border-[#0337AA]/8 bg-[linear-gradient(180deg,#fbfdff_0%,#f4f8ff_100%)] p-4 shadow-[0_10px_24px_rgba(3,55,170,0.06)] ${className}`.trim()}
    >
      {children}
    </article>
  )
}
