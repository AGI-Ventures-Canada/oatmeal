"use client"

import Link from "next/link"
import { Bot, MoreHorizontal, Play, Pencil, Trash2 } from "lucide-react"
import type { Agent } from "@/lib/db/agent-types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface AgentListProps {
  agents: Agent[]
}

const modelLabels: Record<string, string> = {
  "claude-sonnet-4-5-20250929": "Sonnet 4.5",
  "claude-haiku-4-5-20251001": "Haiku 4.5",
  "claude-opus-4-5-20251101": "Opus 4.5",
}

const typeLabels: Record<string, string> = {
  ai_sdk: "AI SDK",
  claude_sdk: "Claude SDK",
}

export function AgentList({ agents }: AgentListProps) {
  if (agents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Bot className="size-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">No agents yet</h3>
        <p className="text-sm text-muted-foreground max-w-sm mt-1">
          Create your first agent to get started with AI automation
        </p>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Model</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="w-[50px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {agents.map((agent) => (
          <TableRow key={agent.id}>
            <TableCell>
              <Link
                href={`/agents/${agent.id}`}
                className="font-medium hover:underline"
              >
                {agent.name}
              </Link>
              {agent.description && (
                <p className="text-sm text-muted-foreground truncate max-w-xs">
                  {agent.description}
                </p>
              )}
            </TableCell>
            <TableCell>
              <Badge variant="outline">
                {typeLabels[agent.type] || agent.type}
              </Badge>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {modelLabels[agent.model] || agent.model}
            </TableCell>
            <TableCell>
              <Badge variant={agent.is_active ? "default" : "secondary"}>
                {agent.is_active ? "Active" : "Inactive"}
              </Badge>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {(() => {
                const d = new Date(agent.created_at)
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
              })()}
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/agents/${agent.id}/run`}>
                      <Play className="size-4 mr-2" />
                      Run Agent
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/agents/${agent.id}`}>
                      <Pencil className="size-4 mr-2" />
                      Edit
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive">
                    <Trash2 className="size-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
