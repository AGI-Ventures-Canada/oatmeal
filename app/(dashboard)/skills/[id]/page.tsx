import { auth } from "@clerk/nextjs/server"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { getSkillById } from "@/lib/services/skills"
import { getOrCreateTenant } from "@/lib/services/tenants"
import { SkillDetail } from "@/components/dashboard/skill-detail"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function SkillDetailPage({ params }: PageProps) {
  const { id } = await params
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

  const skill = await getSkillById(id, tenant.id)
  if (!skill) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/skills">
            <ChevronLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{skill.name}</h1>
          {skill.description && (
            <p className="text-muted-foreground">{skill.description}</p>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {skill.is_builtin ? "Skill Details" : "Edit Skill"}
          </CardTitle>
          <CardDescription>
            {skill.is_builtin
              ? "This is a built-in skill and cannot be modified"
              : "Update the skill configuration and content"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SkillDetail skill={skill} />
        </CardContent>
      </Card>
    </div>
  )
}
