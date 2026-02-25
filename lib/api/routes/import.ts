import { Elysia, t } from "elysia"
import { extractLumaEventData } from "@/lib/services/luma-import"

export const importRoutes = new Elysia({ prefix: "/public/import" })
  .post(
    "/luma",
    async ({ body, set }) => {
      const data = await extractLumaEventData(body.slug)

      if (!data) {
        set.status = 404
        return { error: "Could not extract event data from Luma" }
      }

      return data
    },
    {
      detail: {
        summary: "Extract Luma event data",
        description: "Fetches a public Luma event page and extracts structured data. No authentication required.",
        tags: ["public"],
      },
      body: t.Object({
        slug: t.String({ minLength: 1 }),
      }),
    }
  )
