"use client"

import { type ReactNode, useState } from "react"
import { Check, Copy, Download, Terminal } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

const INSTALL_COMMAND = "npx skills add AGI-Ventures-Canada/oatmeal"

interface InstallSkillButtonProps {
  trigger?: ReactNode
}

export function InstallSkillButton({ trigger }: InstallSkillButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(INSTALL_COMMAND)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline">
            <Download className="size-4 mr-2" />
            Install Skill
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Install Oatmeal Skills</DialogTitle>
          <DialogDescription>
            Add hackathon management skills to your AI agent. Skills extend your
            agent&apos;s capabilities with hackathon-specific knowledge and
            actions.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-lg bg-muted p-3 font-mono text-sm">
            <Terminal className="size-4 shrink-0 text-muted-foreground" />
            <code className="flex-1 break-all">{INSTALL_COMMAND}</code>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="size-4" />
              ) : (
                <Copy className="size-4" />
              )}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Run this command in your project directory to install the Oatmeal
            hackathon skills. Requires Node.js 18+.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
