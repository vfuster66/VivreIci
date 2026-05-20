"use client"

import { useEffect, useRef } from "react"

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",")

export function useDialogFocusTrap(
  isOpen: boolean,
  onClose: () => void
) {
  const dialogRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!isOpen || !dialogRef.current) {
      return
    }

    const dialogElement = dialogRef.current
    const previousActiveElement = document.activeElement as HTMLElement | null
    const focusableElements = Array.from(
      dialogElement.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    )
    const firstFocusableElement = focusableElements[0] ?? dialogElement
    const lastFocusableElement =
      focusableElements[focusableElements.length - 1] ?? dialogElement

    firstFocusableElement.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key !== "Tab") {
        return
      }

      if (focusableElements.length === 0) {
        event.preventDefault()
        dialogElement.focus()
        return
      }

      const activeElement = document.activeElement as HTMLElement | null

      if (event.shiftKey && activeElement === firstFocusableElement) {
        event.preventDefault()
        lastFocusableElement.focus()
        return
      }

      if (!event.shiftKey && activeElement === lastFocusableElement) {
        event.preventDefault()
        firstFocusableElement.focus()
      }
    }

    dialogElement.addEventListener("keydown", handleKeyDown)

    return () => {
      dialogElement.removeEventListener("keydown", handleKeyDown)
      previousActiveElement?.focus()
    }
  }, [isOpen, onClose])

  return dialogRef
}
