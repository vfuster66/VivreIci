"use client"

import type { ConfidenceLevel } from "@/lib/confidence"

function getConfidenceClasses(level: ConfidenceLevel) {
  switch (level) {
    case "high":
      return "bg-[#EAF3E0] text-[#385314]"
    case "medium":
      return "bg-[#FFF7D6] text-[#9A7800]"
    default:
      return "bg-[#FFF1F2] text-[#9F1239]"
  }
}

function getConfidenceLabel(level: ConfidenceLevel) {
  switch (level) {
    case "high":
      return "Confiance élevée"
    case "medium":
      return "Confiance moyenne"
    default:
      return "Confiance faible"
  }
}

export default function ConfidenceBadge({
  level,
  score,
  summary,
  compact = false,
}: {
  level: ConfidenceLevel
  score: number
  summary?: string
  compact?: boolean
}) {
  return (
    <div className={compact ? "space-y-1" : "space-y-1.5"}>
      <span
        className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${getConfidenceClasses(level)}`}
      >
        {getConfidenceLabel(level)} · {score}/100
      </span>
      {summary ? <p className="text-xs text-[#666666]">{summary}</p> : null}
    </div>
  )
}
