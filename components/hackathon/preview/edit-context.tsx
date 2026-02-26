"use client"

import { createContext, useContext, useState, useCallback, useEffect } from "react"

export type EditSection =
  | "name"
  | "about"
  | "rules"
  | "timeline"
  | "location"
  | "sponsors"
  | null

export const SECTION_ORDER: Exclude<EditSection, null>[] = [
  "name",
  "timeline",
  "location",
  "sponsors",
  "about",
  "rules",
]

interface EditContextValue {
  activeSection: EditSection
  isEditable: boolean
  editMode: boolean
  setEditMode: (mode: boolean) => void
  openSection: (section: EditSection) => void
  closeDrawer: () => void
}

const EditContext = createContext<EditContextValue | null>(null)

interface EditProviderProps {
  children: React.ReactNode
  isEditable: boolean
  defaultEditMode?: boolean
}

export function EditProvider({ children, isEditable, defaultEditMode = true }: EditProviderProps) {
  const [activeSection, setActiveSection] = useState<EditSection>(null)
  const [editMode, setEditModeState] = useState(defaultEditMode)

  const setEditMode = useCallback((mode: boolean) => {
    setEditModeState(mode)
    if (!mode) {
      setActiveSection(null)
    }
  }, [])

  const openSection = useCallback((section: EditSection) => {
    setActiveSection(section)
  }, [])

  const closeDrawer = useCallback(() => {
    setActiveSection(null)
  }, [])

  useEffect(() => {
    if (!activeSection) return
    const el = document.querySelector(`[data-edit-section="${activeSection}"]`)
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }, [activeSection])

  return (
    <EditContext.Provider
      value={{
        activeSection,
        isEditable,
        editMode,
        setEditMode,
        openSection,
        closeDrawer,
      }}
    >
      {children}
    </EditContext.Provider>
  )
}

export function useEdit() {
  const context = useContext(EditContext)
  if (!context) {
    throw new Error("useEdit must be used within EditProvider")
  }
  return context
}

export function useEditOptional() {
  return useContext(EditContext)
}
