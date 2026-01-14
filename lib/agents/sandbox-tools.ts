import { tool } from "ai"
import { z } from "zod"
import {
  executeInSandbox,
  readSandboxFile,
  writeSandboxFiles,
  type SandboxFile,
} from "@/lib/sandbox/daytona"

interface TextEditorState {
  undoHistory: Map<string, string[]>
}

export interface SandboxToolsContext {
  sandboxId: string
  state: TextEditorState
}

export function createSandboxToolsContext(sandboxId: string): SandboxToolsContext {
  return {
    sandboxId,
    state: {
      undoHistory: new Map(),
    },
  }
}

export function createSandboxTools(context: SandboxToolsContext) {
  const bash = tool({
    description: "Execute a bash command in the sandbox. Use this to run shell commands, navigate directories, list files, etc.",
    inputSchema: z.object({
      command: z.string().describe("The bash command to execute"),
    }),
    execute: async ({ command }) => {
      console.log(`[Sandbox Tools] Executing bash: ${command.substring(0, 100)}...`)
      const result = await executeInSandbox(context.sandboxId, command)

      if (result.exitCode !== 0) {
        const output = result.stderr
          ? `Error (exit ${result.exitCode}): ${result.stderr}\n${result.stdout}`
          : `Error (exit ${result.exitCode}): ${result.stdout}`
        console.log(`[Sandbox Tools] Bash error: ${output.substring(0, 200)}`)
        return output
      }

      console.log(`[Sandbox Tools] Bash success: ${result.stdout.substring(0, 200)}...`)
      return result.stdout || "(no output)"
    },
  })

  const textEditor = tool({
    description: "View and edit text files in the sandbox. Commands: view (read file), create (new file), str_replace (replace text), insert (insert line), undo_edit (revert last edit)",
    inputSchema: z.object({
      command: z.enum(["view", "create", "str_replace", "insert", "undo_edit"]).describe("The operation to perform"),
      path: z.string().describe("The file path"),
      file_text: z.string().optional().describe("File content for create command"),
      view_range: z.tuple([z.number(), z.number()]).optional().describe("Line range [start, end] for view command"),
      old_str: z.string().optional().describe("Text to replace for str_replace command"),
      new_str: z.string().optional().describe("New text for str_replace or insert commands"),
      insert_line: z.number().optional().describe("Line number for insert command"),
    }),
    execute: async ({ command, path, file_text, view_range, old_str, new_str, insert_line }) => {
      console.log(`[Sandbox Tools] Text editor ${command}: ${path}`)

      switch (command) {
        case "view":
          return handleView(context, path, view_range)
        case "create":
          return handleCreate(context, path, file_text)
        case "str_replace":
          return handleStrReplace(context, path, old_str, new_str)
        case "insert":
          return handleInsert(context, path, insert_line, new_str)
        case "undo_edit":
          return handleUndoEdit(context, path)
        default:
          return `Unknown command: ${command}`
      }
    },
  })

  return {
    bash,
    str_replace_editor: textEditor,
  }
}

async function handleView(
  context: SandboxToolsContext,
  path: string,
  viewRange?: [number, number]
): Promise<string> {
  const content = await readSandboxFile(context.sandboxId, path)

  if (content === null) {
    return `Error: File not found: ${path}`
  }

  if (!viewRange) {
    return content
  }

  const lines = content.split("\n")
  const [start, end] = viewRange
  const startIdx = Math.max(0, start - 1)
  const endIdx = Math.min(lines.length, end)

  const selectedLines = lines.slice(startIdx, endIdx)
  return selectedLines.map((line, i) => `${startIdx + i + 1}\t${line}`).join("\n")
}

async function handleCreate(
  context: SandboxToolsContext,
  path: string,
  fileText?: string
): Promise<string> {
  if (!fileText) {
    return "Error: file_text is required for create command"
  }

  const existing = await readSandboxFile(context.sandboxId, path)
  if (existing !== null) {
    return `Error: File already exists: ${path}. Use str_replace to modify it.`
  }

  const file: SandboxFile = { path, content: fileText }
  const success = await writeSandboxFiles(context.sandboxId, [file])

  if (!success) {
    return `Error: Failed to create file: ${path}`
  }

  return `File created successfully: ${path}`
}

async function handleStrReplace(
  context: SandboxToolsContext,
  path: string,
  oldStr?: string,
  newStr?: string
): Promise<string> {
  if (oldStr === undefined || newStr === undefined) {
    return "Error: old_str and new_str are required for str_replace command"
  }

  const content = await readSandboxFile(context.sandboxId, path)
  if (content === null) {
    return `Error: File not found: ${path}`
  }

  if (!content.includes(oldStr)) {
    return `Error: old_str not found in file. Make sure it matches exactly, including whitespace.`
  }

  const occurrences = content.split(oldStr).length - 1
  if (occurrences > 1) {
    return `Error: old_str appears ${occurrences} times in file. It must be unique. Add more context to make it unique.`
  }

  saveUndoHistory(context, path, content)

  const newContent = content.replace(oldStr, newStr)
  const file: SandboxFile = { path, content: newContent }
  const success = await writeSandboxFiles(context.sandboxId, [file])

  if (!success) {
    return `Error: Failed to write file: ${path}`
  }

  return `Successfully replaced text in ${path}`
}

async function handleInsert(
  context: SandboxToolsContext,
  path: string,
  insertLine?: number,
  newStr?: string
): Promise<string> {
  if (insertLine === undefined || newStr === undefined) {
    return "Error: insert_line and new_str are required for insert command"
  }

  const content = await readSandboxFile(context.sandboxId, path)
  if (content === null) {
    return `Error: File not found: ${path}`
  }

  saveUndoHistory(context, path, content)

  const lines = content.split("\n")
  const insertIdx = Math.max(0, Math.min(lines.length, insertLine))
  lines.splice(insertIdx, 0, newStr)

  const newContent = lines.join("\n")
  const file: SandboxFile = { path, content: newContent }
  const success = await writeSandboxFiles(context.sandboxId, [file])

  if (!success) {
    return `Error: Failed to write file: ${path}`
  }

  return `Successfully inserted text at line ${insertLine} in ${path}`
}

async function handleUndoEdit(
  context: SandboxToolsContext,
  path: string
): Promise<string> {
  const history = context.state.undoHistory.get(path)
  if (!history || history.length === 0) {
    return `Error: No edit history for ${path}`
  }

  const previousContent = history.pop()!
  const file: SandboxFile = { path, content: previousContent }
  const success = await writeSandboxFiles(context.sandboxId, [file])

  if (!success) {
    history.push(previousContent)
    return `Error: Failed to undo edit for ${path}`
  }

  return `Successfully undid last edit to ${path}`
}

function saveUndoHistory(context: SandboxToolsContext, path: string, content: string): void {
  let history = context.state.undoHistory.get(path)
  if (!history) {
    history = []
    context.state.undoHistory.set(path, history)
  }
  history.push(content)
}
