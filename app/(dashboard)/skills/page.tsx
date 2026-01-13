import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { listSkills } from "@/lib/services/skills"
import { getOrCreateTenant } from "@/lib/services/tenants"
import { SkillList } from "@/components/dashboard/skill-list"
import { CreateSkillButton } from "@/components/dashboard/create-skill-button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default async function SkillsPage() {
  const { userId, orgId } = await auth()

  if (!userId) {
    redirect("/sign-in")
  }

  if (!orgId) {
    redirect("/onboarding")
  }

  const tenant = await getOrCreateTenant(orgId)
  if (!tenant) {
    throw new Error("Failed to get or create tenant")
  }

  const skills = await listSkills(tenant.id, { includeBuiltin: true })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Skills</h1>
          <p className="text-muted-foreground">
            Create reusable skills to extend your agents&apos; capabilities
          </p>
        </div>
        <CreateSkillButton />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Skills</CardTitle>
          <CardDescription>
            Skills can be attached to agents to provide specialized instructions and tools
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SkillList skills={skills} />
        </CardContent>
      </Card>
    </div>
  )
}
