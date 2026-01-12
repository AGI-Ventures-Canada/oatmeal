"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Trash2 } from "lucide-react"
import type { ApiKeyDisplay } from "@/lib/types/dashboard"
import { formatDate } from "@/lib/utils/format"

type Props = {
  keys: ApiKeyDisplay[]
}

export function ApiKeyTable({ keys }: Props) {
  const router = useRouter()
  const [revoking, setRevoking] = useState<string | null>(null)

  async function handleRevoke(keyId: string) {
    setRevoking(keyId)
    try {
      const res = await fetch(`/api/dashboard/keys/${keyId}/revoke`, {
        method: "POST",
      })
      if (res.ok) {
        router.refresh()
      }
    } finally {
      setRevoking(null)
    }
  }

  if (keys.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No API keys yet. Create one to get started.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Prefix</TableHead>
          <TableHead>Scopes</TableHead>
          <TableHead>Created</TableHead>
          <TableHead>Last Used</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-12"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {keys.map((key) => (
          <TableRow key={key.id}>
            <TableCell className="font-medium">{key.name}</TableCell>
            <TableCell>
              <code className="bg-muted px-2 py-1">{key.prefix}...</code>
            </TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {key.scopes.map((scope) => (
                  <Badge key={scope} variant="secondary">
                    {scope}
                  </Badge>
                ))}
              </div>
            </TableCell>
            <TableCell>{formatDate(key.createdAt)}</TableCell>
            <TableCell>
              {key.lastUsedAt ? formatDate(key.lastUsedAt) : "Never"}
            </TableCell>
            <TableCell>
              {key.revokedAt ? (
                <Badge variant="destructive">Revoked</Badge>
              ) : (
                <Badge variant="default">Active</Badge>
              )}
            </TableCell>
            <TableCell>
              {!key.revokedAt && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => handleRevoke(key.id)}
                      disabled={revoking === key.id}
                    >
                      <Trash2 className="size-4 mr-2" />
                      Revoke Key
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
