import { listScenarios, getActiveScenarios } from "@/lib/services/admin-scenarios"
import { ScenarioRunner } from "./runner"

export default async function AdminScenariosPage() {
  const isDeployedEnv = process.env.NODE_ENV === "production" || !!process.env.VERCEL_ENV

  if (isDeployedEnv) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Test Scenarios</h1>
          <p className="text-sm text-muted-foreground">
            Scenarios are only available in local development.
          </p>
        </div>
      </div>
    )
  }

  const [scenarios, activeScenarios] = await Promise.all([
    Promise.resolve(listScenarios()),
    getActiveScenarios(),
  ])

  const activeByName = Object.fromEntries(
    activeScenarios.map((s) => [s.scenarioName, s])
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Test Scenarios</h1>
        <p className="text-sm text-muted-foreground">
          Seed the database with hackathons at specific lifecycle stages.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {scenarios.map((scenario) => (
          <ScenarioRunner
            key={scenario.name}
            scenario={scenario}
            existingRun={activeByName[scenario.name] ?? null}
          />
        ))}
      </div>
    </div>
  )
}
