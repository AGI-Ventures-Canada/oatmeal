import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { OrganizationList } from "@clerk/nextjs"

export default async function OnboardingPage() {
  const { userId, orgId } = await auth()

  if (!userId) {
    redirect("/sign-in")
  }

  if (orgId) {
    redirect("/keys")
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Welcome to Agents Server</h1>
          <p className="text-muted-foreground">
            Create or select an organization to get started
          </p>
        </div>
        <OrganizationList
          afterCreateOrganizationUrl="/keys"
          afterSelectOrganizationUrl="/keys"
        />
      </div>
    </div>
  )
}
