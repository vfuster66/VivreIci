"use client"

import { useEffect, useState } from "react"
import QRCode from "qrcode"

type QrCodeCardProps = {
  url: string
  /** Texte sous le QR (optionnel si vous affichez la légende ailleurs). */
  label?: string
  className?: string
  /** Conteneur interne (fond QR) */
  innerClassName?: string
}

export default function QrCodeCard({ url, label, className, innerClassName }: QrCodeCardProps) {
  const [dataUrl, setDataUrl] = useState<string>("")

  useEffect(() => {
    let cancelled = false

    QRCode.toDataURL(url, {
      margin: 1,
      width: 320,
      color: {
        dark: "#182026",
        light: "#ffffff",
      },
    })
      .then((value) => {
        if (!cancelled) {
          setDataUrl(value)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDataUrl("")
        }
      })

    return () => {
      cancelled = true
    }
  }, [url])

  return (
    <div
      className={`rounded-3xl border border-border bg-card p-4 shadow-lg shadow-foreground/5 sm:p-5 ${className ?? ""}`}
    >
      <div
        className={`rounded-2xl border border-border bg-background p-3 sm:p-4 ${innerClassName ?? ""}`}
      >
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={dataUrl} alt={label} className="h-auto w-full rounded-xl" />
        ) : (
          <div className="aspect-square w-full min-w-[9rem] animate-pulse rounded-xl bg-muted sm:min-w-[11rem]" />
        )}
      </div>
      {label ? <p className="mt-3 text-center text-xs text-muted-foreground sm:mt-4 sm:text-sm">{label}</p> : null}
    </div>
  )
}
