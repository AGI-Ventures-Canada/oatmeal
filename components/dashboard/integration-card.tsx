"use client"

import { Check, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"

interface IntegrationCardProps {
  provider: string
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  connected: boolean
  accountEmail?: string
  onConnect: () => void
  onDisconnect: () => void
  loading?: boolean
  connectLabel?: string
  badge?: React.ReactNode
}

export function IntegrationCard({
  name,
  description,
  icon: Icon,
  connected,
  accountEmail,
  onConnect,
  onDisconnect,
  loading,
  connectLabel = "Connect",
  badge,
}: IntegrationCardProps) {
  return (
    <Card className={connected ? "border-green-500/50" : ""}>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className="p-2 rounded-lg bg-muted">
            <Icon className="size-6" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{name}</h3>
              {badge && (
                <Badge variant="outline" className="text-muted-foreground">
                  {badge}
                </Badge>
              )}
              {connected && (
                <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                  <Check className="size-3 mr-1" />
                  Connected
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{description}</p>
            {connected && accountEmail && (
              <p className="text-xs text-muted-foreground pt-1">
                Connected as: {accountEmail}
              </p>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="border-t pt-4">
        {connected ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onDisconnect}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Disconnecting...
              </>
            ) : (
              "Disconnect"
            )}
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={onConnect}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              connectLabel
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
