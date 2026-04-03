import * as React from "react"
import { Badge } from "@/components/ui/badge"

function TabCount({
  children,
  ...props
}: Omit<React.ComponentProps<typeof Badge>, "variant">) {
  return (
    <Badge variant="count" {...props}>
      {children}
    </Badge>
  )
}

export { TabCount }
