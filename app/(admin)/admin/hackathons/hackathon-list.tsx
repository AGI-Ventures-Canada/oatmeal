"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Search, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import Link from "next/link"

export type Hackathon = {
  id: string
  name: string
  slug: string
  status: string
  starts_at: string | null
  ends_at: string | null
  created_at: string
  tenant_id: string
  tenants: { id: string; name: string; slug: string | null }
  [key: string]: unknown
}

type Props = {
  initialHackathons: Hackathon[]
  initialPage: number
  initialTotalPages: number
  initialTotal: number
  initialSearch: string
  initialStatus: string
}

const STATUSES = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "registration_open", label: "Registration Open" },
  { value: "active", label: "Active" },
  { value: "judging", label: "Judging" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
]

const PAGE_SIZE = 25

export function AdminHackathonList({
  initialHackathons,
  initialPage,
  initialTotalPages,
  initialTotal,
  initialSearch,
  initialStatus,
}: Props) {
  const [hackathons, setHackathons] = useState<Hackathon[]>(initialHackathons)
  const [page, setPage] = useState(initialPage)
  const [totalPages, setTotalPages] = useState(initialTotalPages)
  const [total, setTotal] = useState(initialTotal)
  const [search, setSearch] = useState(initialSearch)
  const [status, setStatus] = useState(initialStatus || "all")
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const isInitialMount = useRef(true)

  const fetchHackathons = useCallback(async (p: number, q: string, s: string) => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set("limit", String(PAGE_SIZE))
    params.set("offset", String((p - 1) * PAGE_SIZE))
    if (q) params.set("search", q)
    if (s && s !== "all") params.set("status", s)

    const res = await fetch(`/api/admin/hackathons?${params}`)
    if (res.ok) {
      const data = await res.json()
      setHackathons(data.hackathons)
      setTotal(data.total)
      setTotalPages(Math.ceil(data.total / PAGE_SIZE))
      setPage(p)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchHackathons(1, search, status)
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [search, status, fetchHackathons])

  function goToPage(p: number) {
    fetchHackathons(p, search, status)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function handlePageClick(targetPage: number) {
    return (e: React.MouseEvent) => {
      e.preventDefault()
      goToPage(targetPage)
    }
  }

  function renderPageNumbers() {
    const pages: React.ReactNode[] = []
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(
          <PaginationItem key={i}>
            <PaginationLink href="#" isActive={i === page} onClick={handlePageClick(i)}>
              {i}
            </PaginationLink>
          </PaginationItem>
        )
      }
    } else {
      pages.push(
        <PaginationItem key={1}>
          <PaginationLink href="#" isActive={1 === page} onClick={handlePageClick(1)}>1</PaginationLink>
        </PaginationItem>
      )
      if (page > 3) {
        pages.push(<PaginationItem key="start-ellipsis"><PaginationEllipsis /></PaginationItem>)
      }
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
        pages.push(
          <PaginationItem key={i}>
            <PaginationLink href="#" isActive={i === page} onClick={handlePageClick(i)}>
              {i}
            </PaginationLink>
          </PaginationItem>
        )
      }
      if (page < totalPages - 2) {
        pages.push(<PaginationItem key="end-ellipsis"><PaginationEllipsis /></PaginationItem>)
      }
      pages.push(
        <PaginationItem key={totalPages}>
          <PaginationLink href="#" isActive={totalPages === page} onClick={handlePageClick(totalPages)}>
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      )
    }
    return pages
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">All Hackathons</h1>
        <p className="text-sm text-muted-foreground">
          {total} total{loading && <Loader2 className="ml-2 inline size-3 animate-spin" />}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search hackathons..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            name="admin-hackathon-search"
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
            data-form-type="other"
            autoFocus
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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
                  {(h.tenants as { name: string } | null)?.name ?? "—"}
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
                  {search || (status && status !== "all") ? "No hackathons match your filters." : "No hackathons found."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => { e.preventDefault(); if (page > 1) goToPage(page - 1) }}
                className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
            {renderPageNumbers()}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => { e.preventDefault(); if (page < totalPages) goToPage(page + 1) }}
                className={page >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  )
}
