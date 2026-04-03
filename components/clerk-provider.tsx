"use client"

import { ClerkProvider } from "@clerk/nextjs"
import { dark } from "@clerk/themes"
import { useTheme } from "next-themes"

export function ThemedClerkProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { resolvedTheme } = useTheme()

  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return <>{children}</>
  }

  return (
    <ClerkProvider
      appearance={{
        baseTheme: resolvedTheme === "dark" ? dark : undefined,
        elements: {
          card: "rounded-none shadow-none",
          formButtonPrimary:
            "bg-primary text-primary-foreground rounded-none hover:bg-primary/90",
          formFieldInput: "rounded-none border-input",
          socialButtonsBlockButton: "rounded-none border-border",
          otpCodeFieldInput: "rounded-none",
          alternativeMethodsBlockButton: "rounded-none",
          avatarBox: "rounded-none",
          userButtonPopoverCard: "rounded-none border border-border",
          userPreviewMainIdentifier: "font-medium",
        },
      }}
    >
      {children}
    </ClerkProvider>
  )
}
