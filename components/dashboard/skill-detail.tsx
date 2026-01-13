"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Save, Lock } from "lucide-react"
import type { Skill } from "@/lib/db/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"

interface SkillDetailProps {
  skill: Skill
}

export function SkillDetail({ skill }: SkillDetailProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState(skill.name)
  const [slug, setSlug] = useState(skill.slug)
  const [description, setDescription] = useState(skill.description ?? "")
  const [content, setContent] = useState(skill.content)

  const isBuiltin = skill.is_builtin ?? false

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isBuiltin || !name.trim() || !slug.trim() || !content.trim()) return

    setLoading(true)
    try {
      const response = await fetch(`/api/dashboard/skills/${skill.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim() || null,
          content: content.trim(),
        }),
      })

      if (response.ok) {
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {isBuiltin && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
          <Lock className="size-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Built-in skills are read-only and cannot be modified
          </span>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isBuiltin}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="slug">Slug</Label>
          <Input
            id="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            disabled={isBuiltin}
            required
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description"
          disabled={isBuiltin}
        />
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="content">Content (Markdown)</Label>
          {skill.version && (
            <Badge variant="outline">v{skill.version}</Badge>
          )}
        </div>
        <Textarea
          id="content"
          rows={16}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="font-mono text-sm"
          disabled={isBuiltin}
          required
        />
      </div>

      {!isBuiltin && (
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={loading || !name.trim() || !slug.trim() || !content.trim()}
          >
            {loading ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="size-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      )}
    </form>
  )
}
