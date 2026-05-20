import { cn } from "@/lib/utils"

type FeedbackBannerProps = {
  children: React.ReactNode
  className?: string
  variant?: "error" | "info" | "success" | "warning"
}

const toneClasses: Record<NonNullable<FeedbackBannerProps["variant"]>, string> = {
  error: "border border-[#F9C7CB] bg-[#FFF5F5] text-[#8A1C23]",
  info: "border border-gray-200 bg-[#FBFBFB] text-[#666666]",
  success: "bg-[#ECFDF3] text-[#027A48]",
  warning: "border border-[#F1E4A6] bg-[#FFFDF2] text-[#5F5A45]",
}

export default function FeedbackBanner({
  children,
  className,
  variant = "info",
}: FeedbackBannerProps) {
  const liveRole =
    variant === "error" ? "alert" : variant === "success" ? "status" : "status"

  return (
    <div
      role={liveRole}
      aria-live="polite"
      className={cn(
        "rounded-[24px] px-4 py-3.5 text-sm leading-6",
        toneClasses[variant],
        className
      )}
    >
      {children}
    </div>
  )
}
