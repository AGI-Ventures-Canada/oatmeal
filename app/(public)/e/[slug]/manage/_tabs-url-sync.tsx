"use client"

import { useCallback, useEffect, useState } from "react"
import { Tabs } from "@/components/ui/tabs"

export function TabsUrlSync({
  paramKey,
  value: initialValue,
  className,
  children,
}: {
  paramKey: string
  value: string
  className?: string
  children: React.ReactNode
}) {
  const [value, setValue] = useState(initialValue)

  useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  const handleChange = useCallback(
    (next: string) => {
      setValue(next)
      const params = new URLSearchParams(window.location.search)
      params.set(paramKey, next)
      window.history.replaceState(null, "", `?${params.toString()}`)
    },
    [paramKey],
  )

  return (
    <Tabs value={value} onValueChange={handleChange} className={className}>
      {children}
    </Tabs>
  )
}
