"use client"

import { createContext, useContext, useState, useCallback } from "react"

export type EditSection =
  | "hero"
  | "about"
  | "rules"
  | "timeline"
  | "sponsors"
  | null

interface EditContextValue {
  activeSection: EditSection
  isEditable: boolean
  openSection: (section: EditSection) => void
  closeDrawer: () => void
}

const EditContext = createContext<EditContextValue | null>(null)

interface EditProviderProps {
  children: React.ReactNode
  isEditable: boolean
}

export function EditProvider({ children, isEditable }: EditProviderProps) {
  const [activeSection, setActiveSection] = useState<EditSection>(null)

  const openSection = useCallback((section: EditSection) => {
    setActiveSection(section)
  }, [])

  const closeDrawer = useCallback(() => {
    setActiveSection(null)
  }, [])

  return (
    <EditContext.Provider
      value={{
        activeSection,
        isEditable,
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
