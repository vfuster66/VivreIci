"use client"

import Link from "next/link"

import { isAbsoluteHttpUrl, marketingLegalHref, type MarketingLegalPage } from "@/lib/marketing-site"

type MarketingLegalLinkProps = {
  page: MarketingLegalPage
  children: React.ReactNode
  className?: string
}

export function MarketingLegalLink({ page, children, className }: MarketingLegalLinkProps) {
  const href = marketingLegalHref(page)
  if (isAbsoluteHttpUrl(href)) {
    return (
      <a href={href} className={className} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    )
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  )
}
