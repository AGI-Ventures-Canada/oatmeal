"use client"

import { SignUpForm } from "@/components/auth/sign-up-form"

export function CustomSignUp() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mb-8 text-center">
        <h1 className="font-bold text-2xl text-foreground">Oatmeal</h1>
      </div>
      <SignUpForm />
    </div>
  )
}
