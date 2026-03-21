import { listScenarios } from "@/lib/services/admin-scenarios"
import { ScenarioRunner } from "./runner"

export default function AdminScenariosPage() {
  const scenarios = listScenarios()
  const isLocalOnly = !process.env.VERCEL_ENV

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Test Scenarios</h1>
        <p className="text-sm text-muted-foreground">
          Seed the database with hackathons at specific lifecycle stages.
        </p>
        {!isLocalOnly && (
          <p className="mt-2 text-sm text-destructive">
            Scenarios are only available in local development. They are disabled in deployed environments.
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {scenarios.map((scenario) => (
          <ScenarioRunner key={scenario.name} scenario={scenario} disabled={!isLocalOnly} />
        ))}
      </div>
    </div>
  )
}
