import type { Skill } from "@/lib/db/agent-types"

export type ToolSet = Record<string, unknown>

export function buildToolsFromSkills(
  skills: Skill[],
  integrationTokens: Record<string, string>
): ToolSet {
  const tools: ToolSet = {}

  for (const skill of skills) {
    const allowedTools = parseAllowedTools(skill.content)

    for (const toolName of allowedTools) {
      const builtTool = buildIntegrationTool(toolName, integrationTokens)
      if (builtTool) {
        tools[toolName] = builtTool
      }
    }
  }

  return tools
}

function parseAllowedTools(skillContent: string): string[] {
  const frontmatterMatch = skillContent.match(/^---\n([\s\S]*?)\n---/)
  if (!frontmatterMatch) return []

  const frontmatter = frontmatterMatch[1]
  const toolsMatch = frontmatter.match(/allowed-tools:\s*(.+)/)
  if (!toolsMatch) return []

  return toolsMatch[1].split(",").map((t) => t.trim())
}

interface ToolDefinition {
  name: string
  description: string
  execute: (params: Record<string, unknown>) => Promise<unknown>
}

function buildIntegrationTool(
  toolName: string,
  tokens: Record<string, string>
): ToolDefinition | null {
  switch (toolName) {
    case "gmail_list":
      return {
        name: "gmail_list",
        description: "List emails from Gmail inbox",
        execute: async (params: Record<string, unknown>) => {
          const token = tokens["GMAIL_ACCESS_TOKEN"]
          if (!token) return { error: "Gmail not connected" }

          const maxResults = (params.maxResults as number) || 10
          const query = params.query as string | undefined

          const searchParams = new URLSearchParams({
            maxResults: String(maxResults),
            ...(query && { q: query }),
          })

          const response = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages?${searchParams}`,
            { headers: { Authorization: `Bearer ${token}` } }
          )

          if (!response.ok) {
            return { error: `Gmail API error: ${response.status}` }
          }

          return response.json()
        },
      }

    case "gmail_read":
      return {
        name: "gmail_read",
        description: "Read a specific email from Gmail",
        execute: async (params: Record<string, unknown>) => {
          const token = tokens["GMAIL_ACCESS_TOKEN"]
          if (!token) return { error: "Gmail not connected" }

          const messageId = params.messageId as string

          const response = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`,
            { headers: { Authorization: `Bearer ${token}` } }
          )

          if (!response.ok) {
            return { error: `Gmail API error: ${response.status}` }
          }

          return response.json()
        },
      }

    case "gmail_send":
      return {
        name: "gmail_send",
        description: "Send an email via Gmail",
        execute: async (params: Record<string, unknown>) => {
          const token = tokens["GMAIL_ACCESS_TOKEN"]
          if (!token) return { error: "Gmail not connected" }

          const to = params.to as string
          const subject = params.subject as string
          const body = params.body as string

          const email = [`To: ${to}`, `Subject: ${subject}`, "", body].join("\r\n")

          const encodedEmail = Buffer.from(email)
            .toString("base64")
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "")

          const response = await fetch(
            "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ raw: encodedEmail }),
            }
          )

          if (!response.ok) {
            return { error: `Gmail API error: ${response.status}` }
          }

          return response.json()
        },
      }

    case "calendar_list":
      return {
        name: "calendar_list",
        description: "List upcoming calendar events",
        execute: async (params: Record<string, unknown>) => {
          const token = tokens["GOOGLE_CALENDAR_ACCESS_TOKEN"]
          if (!token) return { error: "Google Calendar not connected" }

          const maxResults = (params.maxResults as number) || 10
          const timeMin = params.timeMin as string | undefined
          const timeMax = params.timeMax as string | undefined

          const searchParams = new URLSearchParams({
            maxResults: String(maxResults),
            singleEvents: "true",
            orderBy: "startTime",
            ...(timeMin && { timeMin }),
            ...(timeMax && { timeMax }),
          })

          const response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events?${searchParams}`,
            { headers: { Authorization: `Bearer ${token}` } }
          )

          if (!response.ok) {
            return { error: `Calendar API error: ${response.status}` }
          }

          return response.json()
        },
      }

    case "calendar_create":
      return {
        name: "calendar_create",
        description: "Create a calendar event",
        execute: async (params: Record<string, unknown>) => {
          const token = tokens["GOOGLE_CALENDAR_ACCESS_TOKEN"]
          if (!token) return { error: "Google Calendar not connected" }

          const summary = params.summary as string
          const description = params.description as string | undefined
          const startTime = params.startTime as string
          const endTime = params.endTime as string
          const attendees = params.attendees as string[] | undefined

          const event = {
            summary,
            description,
            start: { dateTime: startTime },
            end: { dateTime: endTime },
            attendees: attendees?.map((email) => ({ email })),
          }

          const response = await fetch(
            "https://www.googleapis.com/calendar/v3/calendars/primary/events",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(event),
            }
          )

          if (!response.ok) {
            return { error: `Calendar API error: ${response.status}` }
          }

          return response.json()
        },
      }

    case "notion_search":
      return {
        name: "notion_search",
        description: "Search Notion pages and databases",
        execute: async (params: Record<string, unknown>) => {
          const token = tokens["NOTION_ACCESS_TOKEN"]
          if (!token) return { error: "Notion not connected" }

          const query = params.query as string

          const response = await fetch("https://api.notion.com/v1/search", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
              "Notion-Version": "2022-06-28",
            },
            body: JSON.stringify({ query }),
          })

          if (!response.ok) {
            return { error: `Notion API error: ${response.status}` }
          }

          return response.json()
        },
      }

    case "notion_create_page":
      return {
        name: "notion_create_page",
        description: "Create a new Notion page in a database",
        execute: async (params: Record<string, unknown>) => {
          const token = tokens["NOTION_ACCESS_TOKEN"]
          if (!token) return { error: "Notion not connected" }

          const databaseId = params.databaseId as string
          const title = params.title as string
          const properties = (params.properties as Record<string, unknown>) || {}

          const response = await fetch("https://api.notion.com/v1/pages", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
              "Notion-Version": "2022-06-28",
            },
            body: JSON.stringify({
              parent: { database_id: databaseId },
              properties: {
                title: {
                  title: [{ text: { content: title } }],
                },
                ...properties,
              },
            }),
          })

          if (!response.ok) {
            return { error: `Notion API error: ${response.status}` }
          }

          return response.json()
        },
      }

    case "luma_list_events":
      return {
        name: "luma_list_events",
        description: "List Luma events",
        execute: async (params: Record<string, unknown>) => {
          const token = tokens["LUMA_ACCESS_TOKEN"]
          if (!token) return { error: "Luma not connected" }

          const calendarId = params.calendarId as string | undefined
          const queryParams = calendarId ? `?calendar_api_id=${calendarId}` : ""

          const response = await fetch(
            `https://api.lu.ma/public/v1/event/list${queryParams}`,
            { headers: { Authorization: `Bearer ${token}` } }
          )

          if (!response.ok) {
            return { error: `Luma API error: ${response.status}` }
          }

          return response.json()
        },
      }

    case "luma_get_guests":
      return {
        name: "luma_get_guests",
        description: "Get guests for a Luma event",
        execute: async (params: Record<string, unknown>) => {
          const token = tokens["LUMA_ACCESS_TOKEN"]
          if (!token) return { error: "Luma not connected" }

          const eventId = params.eventId as string

          const response = await fetch(
            `https://api.lu.ma/public/v1/event/${eventId}/guests`,
            { headers: { Authorization: `Bearer ${token}` } }
          )

          if (!response.ok) {
            return { error: `Luma API error: ${response.status}` }
          }

          return response.json()
        },
      }

    default:
      return null
  }
}
