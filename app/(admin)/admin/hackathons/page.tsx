import { listAllHackathons } from "@/lib/services/admin"
import type { Hackathon } from "./hackathon-list"
import { AdminHackathonList } from "./hackathon-list"

const PAGE_SIZE = 25

type PageProps = {
  searchParams: Promise<{ status?: string; search?: string; page?: string }>
}

export default async function AdminHackathonsPage(props: PageProps) {
  const searchParams = await props.searchParams
  const page = Math.max(1, parseInt(searchParams.page || "1", 10) || 1)

  const { hackathons, total } = await listAllHackathons({
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
    status: searchParams.status,
    search: searchParams.search,
  })

  return (
    <AdminHackathonList
      initialHackathons={hackathons as unknown as Hackathon[]}
      initialPage={page}
      initialTotalPages={Math.ceil(total / PAGE_SIZE)}
      initialTotal={total}
      initialSearch={searchParams.search ?? ""}
      initialStatus={searchParams.status ?? ""}
    />
  )
}
