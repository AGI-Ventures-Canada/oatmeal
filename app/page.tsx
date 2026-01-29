import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function Home() {
  const { userId } = await auth()

  if (userId) {
    redirect("/home")
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-foreground">Oatmeal</h1>
        <p className="text-xl text-muted-foreground max-w-md">
          The hackathon platform for organizers, teams, and judges.
        </p>
        <Button asChild size="lg">
          <Link href="/sign-in">Get Started</Link>
        </Button>
      </div>
    </main>
  )
}
