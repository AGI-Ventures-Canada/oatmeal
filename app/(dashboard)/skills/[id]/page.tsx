import { auth } from "@clerk/nextjs/server"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { getSkillById } from "@/lib/services/skills"
import { getOrCreateTenant } from "@/lib/services/tenants"
import { SkillDetail } from "@/components/dashboard/skill-detail"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { CopyableId } from "@/components/ui/copyable-id"

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
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/skills">Skills</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{skill.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div>
        <h1 className="text-3xl font-bold">{skill.name}</h1>
        <CopyableId id={skill.id} className="text-sm" />
        {skill.description && (
          <p className="text-muted-foreground mt-1">{skill.description}</p>
        )}
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
