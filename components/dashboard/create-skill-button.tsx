"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function CreateSkillButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [description, setDescription] = useState("")
  const [content, setContent] = useState("")
  const [autoSlug, setAutoSlug] = useState(true)

  const handleNameChange = (value: string) => {
    setName(value)
    if (autoSlug) {
      setSlug(slugify(value))
    }
  }

  const handleSlugChange = (value: string) => {
    setSlug(value)
    setAutoSlug(false)
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!name.trim() || !slug.trim() || !content.trim() || loading) return

    setLoading(true)
    try {
      const response = await fetch("/api/dashboard/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim() || undefined,
          content: content.trim(),
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setOpen(false)
        setName("")
        setSlug("")
        setDescription("")
        setContent("")
        setAutoSlug(true)
        router.refresh()
        router.push(`/skills/${data.id}`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4 mr-2" />
          Create Skill
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <form
          onSubmit={handleSubmit}
          autoComplete="off"
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault()
              handleSubmit()
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>Create New Skill</DialogTitle>
            <DialogDescription>
              Define a reusable skill with instructions for your agents
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="Gmail Assistant"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  autoComplete="off"
                  data-form-type="other"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  placeholder="gmail-assistant"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  autoComplete="off"
                  data-form-type="other"
                  required
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Manages Gmail inbox operations"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                autoComplete="off"
                data-form-type="other"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="content">Skill Content (Markdown)</Label>
              <Textarea
                id="content"
                placeholder="# Gmail Assistant&#10;&#10;This skill provides instructions for managing Gmail..."
                rows={10}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="font-mono text-sm"
                required
              />
              <p className="text-xs text-muted-foreground">
                Write instructions in Markdown format. You can include YAML frontmatter for metadata.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !name.trim() || !slug.trim() || !content.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Skill"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
