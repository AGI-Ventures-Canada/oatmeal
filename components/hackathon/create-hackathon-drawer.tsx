"use client"

import { useState, cloneElement, isValidElement } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import {
  useOrganization,
  useOrganizationList,
} from "@clerk/nextjs"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldGroup,
} from "@/components/ui/field"
import { CreateOrganizationDialog } from "@/components/create-organization-dialog"
import { Plus } from "lucide-react"

type CreateHackathonDrawerProps = {
  trigger: React.ReactNode
}

export function CreateHackathonDrawer({ trigger }: CreateHackathonDrawerProps) {
  const router = useRouter()
  const { organization } = useOrganization()
  const { userMemberships, setActive } = useOrganizationList({
    userMemberships: { infinite: true },
  })
  const [open, setOpen] = useState(false)
  const [orgGateOpen, setOrgGateOpen] = useState(false)
  const [createOrgOpen, setCreateOrgOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

  function resetForm() {
    setName("")
    setDescription("")
    setError(null)
  }

  function handleTriggerClick() {
    if (organization) {
      setOpen(true)
    } else {
      setOrgGateOpen(true)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && name.trim() && !creating) {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent)
    }
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
      router.push(`/e/${data.slug}/manage`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create hackathon")
      setCreating(false)
    }
  }

  const triggerElement = isValidElement(trigger)
    ? cloneElement(trigger as React.ReactElement<{ onClick?: () => void }>, {
        onClick: handleTriggerClick,
      })
    : trigger

  return (
    <>
      {triggerElement}
      <Drawer direction="left" open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="flex flex-col h-full" autoComplete="off">
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
                    name="hackathon-name"
                    type="text"
                    placeholder="My Awesome Hackathon"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoFocus
                    autoComplete="off"
                    data-1p-ignore
                    data-lpignore="true"
                    data-form-type="other"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="description">Description</FieldLabel>
                  <Textarea
                    id="description"
                    name="hackathon-description"
                    placeholder="What's this hackathon about?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    autoComplete="off"
                    data-1p-ignore
                    data-lpignore="true"
                    data-form-type="other"
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

      <Dialog open={orgGateOpen} onOpenChange={setOrgGateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Organization Required</DialogTitle>
            <DialogDescription>
              Hackathons are created under organizations. Switch to an organization or create a new one to get started.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {userMemberships?.data && userMemberships.data.length > 0 && (
              <div className="space-y-1">
                {userMemberships.data.map((mem) => (
                  <button
                    key={mem.organization.id}
                    type="button"
                    onClick={() => {
                      setActive?.({ organization: mem.organization.id })
                      setOrgGateOpen(false)
                      router.push("/home")
                    }}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted"
                  >
                    {mem.organization.imageUrl ? (
                      <Image
                        src={mem.organization.imageUrl}
                        alt={mem.organization.name}
                        width={24}
                        height={24}
                        className="size-6 rounded object-cover"
                      />
                    ) : (
                      <div className="flex size-6 items-center justify-center rounded bg-primary text-primary-foreground text-xs font-semibold">
                        {mem.organization.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span>{mem.organization.name}</span>
                  </button>
                ))}
              </div>
            )}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setOrgGateOpen(false)
                setCreateOrgOpen(true)
              }}
            >
              <Plus className="size-4 mr-2" />
              Create New Organization
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <CreateOrganizationDialog
        open={createOrgOpen}
        onOpenChange={setCreateOrgOpen}
      />
    </>
  )
}
