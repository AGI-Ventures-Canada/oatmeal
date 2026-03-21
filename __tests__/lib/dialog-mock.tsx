import { createContext, isValidElement, cloneElement, useContext, useState, type ReactNode, type ReactElement } from "react"

const DialogContext = createContext({
  open: false,
  setOpen: (_v: boolean) => {},
})

export function Dialog({
  children,
  open: controlledOpen,
  onOpenChange,
}: {
  children: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen

  function setOpen(value: boolean) {
    if (!isControlled) setInternalOpen(value)
    onOpenChange?.(value)
  }

  if (isControlled && !open) return null

  return (
    <DialogContext.Provider value={{ open, setOpen }}>
      {isControlled && (
        <button type="button" onClick={() => setOpen(false)}>
          Close Dialog
        </button>
      )}
      {children}
    </DialogContext.Provider>
  )
}

export function DialogTrigger({
  children,
  asChild,
}: {
  children: ReactNode
  asChild?: boolean
}) {
  const { setOpen, open } = useContext(DialogContext)
  if (asChild && isValidElement(children)) {
    return cloneElement(children as ReactElement<Record<string, unknown>>, {
      onClick: () => setOpen(true),
      "aria-haspopup": "dialog",
      "aria-expanded": String(open),
    })
  }
  return (
    <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open}>
      {children}
    </button>
  )
}

export function DialogContent({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const { open } = useContext(DialogContext)
  if (!open) return null
  return (
    <div role="dialog" className={className}>
      {children}
    </div>
  )
}

export function DialogHeader({ children }: { children: ReactNode }) {
  return <div>{children}</div>
}

export function DialogTitle({ children }: { children: ReactNode }) {
  return <h2>{children}</h2>
}

export function DialogDescription({ children }: { children: ReactNode }) {
  return <p>{children}</p>
}

export function DialogFooter({ children }: { children: ReactNode }) {
  return <div>{children}</div>
}

export function DialogClose({ children }: { children: ReactNode }) {
  return <div>{children}</div>
}
