"use client"

type AdminEmptyStateProps = {
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

export default function AdminEmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: AdminEmptyStateProps) {
  return (
    <div className="rounded-[24px] border border-dashed border-[#0337AA]/20 bg-[#F8FBFF] px-6 py-10 text-center">
      <p className="text-base font-semibold text-[#18212B]">{title}</p>
      <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-[#5B6572]">
        {description}
      </p>
      {actionLabel && onAction ? (
        <div className="mt-5">
          <button
            type="button"
            onClick={onAction}
            className="inline-flex h-11 items-center justify-center rounded-full bg-[#FAC411] px-5 text-sm font-semibold text-[#18212B]"
          >
            {actionLabel}
          </button>
        </div>
      ) : null}
    </div>
  )
}
