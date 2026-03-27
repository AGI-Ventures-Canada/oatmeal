"use client"

import { useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Tabs } from "@/components/ui/tabs"

export function TabsUrlSync({
  paramKey,
  defaultValue,
  className,
  children,
}: {
  paramKey: string
  defaultValue: string
  className?: string
  children: React.ReactNode
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set(paramKey, value)
      router.replace(`?${params.toString()}`, { scroll: false })
    },
    [router, searchParams, paramKey],
  )

  return (
    <Tabs defaultValue={defaultValue} onValueChange={handleChange} className={className}>
      {children}
    </Tabs>
  )
}
