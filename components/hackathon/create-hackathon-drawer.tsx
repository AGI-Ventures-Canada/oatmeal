"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldGroup,
} from "@/components/ui/field"

type CreateHackathonDrawerProps = {
  trigger: React.ReactNode
}

export function CreateHackathonDrawer({ trigger }: CreateHackathonDrawerProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

  function resetForm() {
    setName("")
    setDescription("")
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    setError(null)

    try {
      const res = await fetch("/api/dashboard/hackathons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to create hackathon")
      }

      const data = await res.json()
      setOpen(false)
      resetForm()
      router.push(`/hackathons/${data.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create hackathon")
      setCreating(false)
    }
  }

  return (
    <Drawer direction="right" open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent>
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <DrawerHeader>
            <DrawerTitle>Create Hackathon</DrawerTitle>
            <DrawerDescription>
              Set up a new hackathon. You can add more details later.
            </DrawerDescription>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto px-4">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="name">Hackathon Name</FieldLabel>
                <Input
                  id="name"
                  type="text"
                  placeholder="My Awesome Hackathon"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="description">Description</FieldLabel>
                <Textarea
                  id="description"
                  placeholder="What's this hackathon about?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
                <FieldDescription>
                  A brief description to help participants understand your hackathon
                </FieldDescription>
              </Field>

              {error && (
                <p className="text-destructive text-sm">{error}</p>
              )}
            </FieldGroup>
          </div>

          <DrawerFooter>
            <Button type="submit" disabled={creating || !name.trim()}>
              {creating ? "Creating..." : "Create Hackathon"}
            </Button>
            <DrawerClose asChild>
              <Button type="button" variant="outline" disabled={creating}>
                Cancel
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  )
}
