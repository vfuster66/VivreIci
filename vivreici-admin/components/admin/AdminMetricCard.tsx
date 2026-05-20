"use client"

type AdminMetricCardProps = {
  label: string
  value: number | string | null
  tone?: "default" | "warning" | "danger" | "highlight"
  detail?: string
  actionLabel?: string
  onAction?: () => void
}

export default function AdminMetricCard({
  label,
  value,
  tone = "default",
  detail,
  actionLabel,
  onAction,
}: AdminMetricCardProps) {
  const toneClasses =
    tone === "danger"
      ? "border-[#BE123C]/12 bg-[#FFF1F2] text-[#BE123C]"
      : tone === "warning"
        ? "border-[#FAC411]/30 bg-[#FFF8DF] text-[#8A6700]"
        : tone === "highlight"
          ? "border-[#0337AA]/8 bg-[linear-gradient(180deg,#f6f9ff_0%,#ecf3ff_100%)] text-[#0337AA]"
          : "border-[#0337AA]/8 bg-white text-[#0337AA]"

  return (
    <div
      className={`rounded-[28px] border px-5 py-5 shadow-[0_12px_32px_rgba(3,55,170,0.08)] ${toneClasses}`}
    >
      <p className="text-sm text-current/72">{label}</p>
      <p className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-[#18212B]">
        {value ?? "—"}
      </p>
      {detail ? (
        <p className="mt-2 text-sm leading-6 text-[#5B6572]">{detail}</p>
      ) : null}
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-[#FAC411] px-4 text-sm font-semibold text-[#18212B]"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  )
}
