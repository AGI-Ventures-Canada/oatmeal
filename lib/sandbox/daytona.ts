import { supabase as getSupabase } from "@/lib/db/client"
import type { SandboxSession, Skill } from "@/lib/db/agent-types"
import { encryptJson, decryptJson } from "@/lib/services/encryption"
import { buildSkillFilesForSandbox } from "@/lib/services/skills"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let daytonaClient: any = null

export async function getDaytonaClient() {
  if (!daytonaClient) {
    const { Daytona } = await import("@daytonaio/sdk")

    const config: { apiKey: string; apiUrl?: string; target?: "us" | "eu" } = {
      apiKey: process.env.DAYTONA_API_KEY!,
    }

    if (process.env.DAYTONA_API_URL) {
      config.apiUrl = process.env.DAYTONA_API_URL
    }

    if (process.env.DAYTONA_TARGET) {
      config.target = process.env.DAYTONA_TARGET as "us" | "eu"
    }

    daytonaClient = new Daytona(config)
  }
  return daytonaClient
}

export type CreateSandboxInput = {
  tenantId: string
  agentRunId: string
  snapshotId?: string
  envVars: Record<string, string>
  skills: Skill[]
  autoStopMinutes?: number
}

export interface SandboxInfo {
  id: string
  sandboxId: string
  status: string
}

export async function createSandbox(
  input: CreateSandboxInput
): Promise<SandboxSession | null> {
  const client = await getDaytonaClient()
  const snapshotId = input.snapshotId ?? process.env.DAYTONA_BASE_SNAPSHOT_ID

  if (!snapshotId) {
    console.error("No snapshot ID provided and DAYTONA_BASE_SNAPSHOT_ID not set")
    return null
  }

  try {
    const autoStopMinutes = input.autoStopMinutes ?? 5
    const sandbox = await client.create({
      snapshot: snapshotId,
      envVars: input.envVars,
      autoStopInterval: autoStopMinutes,
      autoArchiveInterval: autoStopMinutes + 5,
    })

    const encryptedEnvVars = encryptJson(input.envVars)

    const { data, error } = await getSupabase()
      .from("sandbox_sessions")
      .insert({
        tenant_id: input.tenantId,
        agent_run_id: input.agentRunId,
        daytona_sandbox_id: sandbox.id,
        snapshot_id: snapshotId,
        status: "started",
        env_vars_encrypted: encryptedEnvVars,
      })
      .select()
      .single()

    if (error || !data) {
      console.error("Failed to record sandbox session:", error)
      await sandbox.delete()
      return null
    }

    const skillFiles = buildSkillFilesForSandbox(input.skills)
    if (skillFiles.length > 0) {
      await writeSandboxFiles(sandbox.id, skillFiles)
    }

    return data as SandboxSession
  } catch (err) {
    console.error("Failed to create sandbox:", err)
    return null
  }
}

export async function getSandboxSession(
  sandboxId: string
): Promise<SandboxSession | null> {
  const { data } = await getSupabase()
    .from("sandbox_sessions")
    .select("*")
    .eq("daytona_sandbox_id", sandboxId)
    .single()

  return data as SandboxSession | null
}

export async function terminateSandbox(sandboxId: string): Promise<boolean> {
  const client = await getDaytonaClient()

  try {
    const sandbox = await client.findOne(sandboxId)
    if (sandbox) {
      await sandbox.delete()
    }

    const { error } = await getSupabase()
      .from("sandbox_sessions")
      .update({
        status: "terminated",
        terminated_at: new Date().toISOString(),
      })
      .eq("daytona_sandbox_id", sandboxId)

    return !error
  } catch (err) {
    console.error("Failed to terminate sandbox:", err)
    return false
  }
}

export interface ExecutionResult {
  stdout: string
  stderr: string
  exitCode: number
}

export async function executeInSandbox(
  sandboxId: string,
  command: string
): Promise<ExecutionResult> {
  const client = await getDaytonaClient()

  try {
    const sandbox = await client.findOne(sandboxId)
    if (!sandbox) {
      throw new Error("Sandbox not found")
    }

    console.log(`[Daytona] Executing command: ${command.substring(0, 100)}...`)

    // Try direct execution first (simpler API)
    const result = await sandbox.process.executeCommand(command)
    console.log(`[Daytona] Command result:`, JSON.stringify(result, null, 2))

    // Handle different result formats
    const stdout = result.result ?? result.output ?? result.stdout ?? ""
    const exitCode = result.exitCode ?? result.exit_code ?? result.code ?? 0

    return {
      stdout,
      stderr: "",
      exitCode,
    }
  } catch (err) {
    console.error(`[Daytona] Command execution error:`, err)
    return {
      stdout: "",
      stderr: err instanceof Error ? err.message : "Unknown error",
      exitCode: 1,
    }
  }
}

export interface SandboxFile {
  path: string
  content: string
}

export async function writeSandboxFiles(
  sandboxId: string,
  files: SandboxFile[]
): Promise<boolean> {
  const client = await getDaytonaClient()

  try {
    const sandbox = await client.findOne(sandboxId)
    if (!sandbox) {
      throw new Error("Sandbox not found")
    }

    for (const file of files) {
      const dirPath = file.path.split("/").slice(0, -1).join("/")
      if (dirPath) {
        await sandbox.fs.createFolder(dirPath, "755")
      }
      await sandbox.fs.uploadFile(Buffer.from(file.content), file.path)
    }

    return true
  } catch (err) {
    console.error("Failed to write sandbox files:", err)
    return false
  }
}

export async function readSandboxFile(
  sandboxId: string,
  path: string
): Promise<string | null> {
  const client = await getDaytonaClient()

  try {
    const sandbox = await client.findOne(sandboxId)
    if (!sandbox) {
      throw new Error("Sandbox not found")
    }

    const content = await sandbox.fs.downloadFile(path)
    return content.toString()
  } catch (err) {
    console.error("Failed to read sandbox file:", err)
    return null
  }
}

export async function* streamSandboxLogs(
  sandboxId: string,
  sessionId: string,
  commandId: string
): AsyncGenerator<string> {
  const client = await getDaytonaClient()

  try {
    const sandbox = await client.findOne(sandboxId)
    if (!sandbox) {
      throw new Error("Sandbox not found")
    }

    const logs = await sandbox.process.getSessionCommandLogs(sessionId, commandId)
    if (logs.stdout) {
      yield logs.stdout
    }
    if (logs.stderr) {
      yield `[stderr] ${logs.stderr}`
    }
  } catch (err) {
    yield `[error] ${err instanceof Error ? err.message : "Unknown error"}`
  }
}

export async function getEnvVarsForSandbox(
  session: SandboxSession
): Promise<Record<string, string>> {
  if (!session.env_vars_encrypted) {
    return {}
  }

  try {
    return decryptJson<Record<string, string>>(
      session.env_vars_encrypted as string
    )
  } catch {
    return {}
  }
}
