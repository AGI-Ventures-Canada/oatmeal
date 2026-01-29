import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { OrganizationList } from "@clerk/nextjs"

export default async function OnboardingPage() {
  const { userId, orgId } = await auth()

  if (!userId) {
    redirect("/sign-in")
  }

  if (orgId) {
    redirect("/home")
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center text-center space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Welcome to Oatmeal</h1>
          <p className="text-muted-foreground">
            Create or select an organization, or continue with a personal
            account
          </p>
        </div>
        <OrganizationList
          afterCreateOrganizationUrl="/home"
          afterSelectOrganizationUrl="/home"
          afterSelectPersonalUrl="/home"
        />
        <div className="pt-2">
          <Link href="/home" className="text-sm text-muted-foreground underline">
            Continue with personal account
          </Link>
        </div>
      </div>
    </div>
  )
}
