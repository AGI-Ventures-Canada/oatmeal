"use client"

import { useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Tabs } from "@/components/ui/tabs"

export function TabsUrlSync({
  paramKey,
  value,
  className,
  children,
}: {
  paramKey: string
  value: string
  className?: string
  children: React.ReactNode
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleChange = useCallback(
    (next: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set(paramKey, next)
      router.replace(`?${params.toString()}`, { scroll: false })
    },
    [router, searchParams, paramKey],
  )

  return (
    <Tabs value={value} onValueChange={handleChange} className={className}>
      {children}
    </Tabs>
  )
}
