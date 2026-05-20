"use client"

type AdminMiniStatProps = {
  label: string
  value: React.ReactNode
}

export default function AdminMiniStat({ label, value }: AdminMiniStatProps) {
  return (
    <div className="rounded-2xl bg-white px-3 py-3 text-sm text-[#18212B] ring-1 ring-black/5">
      <p className="text-xs uppercase tracking-[0.18em] text-[#6B7280]">{label}</p>
      <div className="mt-2">{value}</div>
    </div>
  )
}
