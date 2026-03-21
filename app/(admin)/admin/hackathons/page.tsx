import { listAllHackathons } from "@/lib/services/admin"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import Link from "next/link"

type PageProps = {
  searchParams: Promise<{ status?: string; search?: string; page?: string }>
}

export default async function AdminHackathonsPage(props: PageProps) {
  const searchParams = await props.searchParams
  const page = parseInt(searchParams.page ?? "1")
  const limit = 25
  const offset = (page - 1) * limit

  const { hackathons, total } = await listAllHackathons({
    limit,
    offset,
    status: searchParams.status,
    search: searchParams.search,
  })

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">All Hackathons</h1>
        <p className="text-sm text-muted-foreground">{total} total</p>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Tenant</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Starts</TableHead>
              <TableHead>Ends</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hackathons.map((h) => (
              <TableRow key={h.id}>
                <TableCell>
                  <Link
                    href={`/admin/hackathons/${h.id}`}
                    className="font-medium text-primary underline-offset-4 hover:underline"
                  >
                    {h.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">{h.slug}</p>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {(h.tenants as { name: string })?.name ?? "—"}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{h.status}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {h.starts_at ? new Date(h.starts_at).toLocaleDateString() : "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {h.ends_at ? new Date(h.ends_at).toLocaleDateString() : "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(h.created_at).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
            {hackathons.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No hackathons found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          {page > 1 && (
            <Link
              href={`/admin/hackathons?page=${page - 1}${searchParams.status ? `&status=${searchParams.status}` : ""}${searchParams.search ? `&search=${searchParams.search}` : ""}`}
              className="text-primary underline-offset-4 hover:underline"
            >
              Previous
            </Link>
          )}
          <span className="text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/admin/hackathons?page=${page + 1}${searchParams.status ? `&status=${searchParams.status}` : ""}${searchParams.search ? `&search=${searchParams.search}` : ""}`}
              className="text-primary underline-offset-4 hover:underline"
            >
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
