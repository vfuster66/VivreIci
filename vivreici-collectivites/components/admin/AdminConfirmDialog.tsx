"use client"

import { useEffect, useRef } from "react"

function getFocusableElements(container: HTMLElement | null) {
  if (!container) {
    return []
  }

  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter((element) => !element.hasAttribute("hidden"))
}

export default function AdminConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Annuler",
  tone = "danger",
  onConfirm,
  onCancel,
  isSubmitting = false,
}: {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  cancelLabel?: string
  tone?: "danger" | "warning"
  onConfirm: () => void
  onCancel: () => void
  isSubmitting?: boolean
}) {
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const previousActiveElementRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    previousActiveElementRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSubmitting) {
        onCancel()
        return
      }

      if (event.key !== "Tab") {
        return
      }

      const focusableElements = getFocusableElements(dialogRef.current)

      if (focusableElements.length === 0) {
        event.preventDefault()
        return
      }

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]
      const activeElement =
        document.activeElement instanceof HTMLElement ? document.activeElement : null

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", onKeyDown)
    const focusableElements = getFocusableElements(dialogRef.current)
    const firstElement = focusableElements[0] ?? dialogRef.current
    firstElement?.focus()

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", onKeyDown)
      previousActiveElementRef.current?.focus()
    }
  }, [isSubmitting, onCancel, open])

  if (!open) {
    return null
  }

  const confirmClasses =
    tone === "warning"
      ? "bg-[#FAC411] text-[#18212B]"
      : "bg-[#BE123C] text-white"

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#18212B]/45 px-4 py-6 backdrop-blur-[2px]">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-confirm-title"
        aria-describedby="admin-confirm-description"
        tabIndex={-1}
        className="w-full max-w-lg rounded-[32px] border border-[#0337AA]/10 bg-white p-6 shadow-[0_30px_80px_rgba(3,55,170,0.18)]"
      >
        <p
          id="admin-confirm-title"
          className="text-xl font-semibold text-[#18212B]"
        >
          {title}
        </p>
        <p
          id="admin-confirm-description"
          className="mt-3 text-sm leading-6 text-[#5B6572]"
        >
          {description}
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className={`inline-flex h-12 items-center justify-center rounded-full px-5 text-sm font-semibold disabled:opacity-60 ${confirmClasses}`}
          >
            {isSubmitting ? "Confirmation..." : confirmLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="inline-flex h-12 items-center justify-center rounded-full bg-[#EAF0FB] px-5 text-sm font-semibold text-[#0337AA] disabled:opacity-60"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
