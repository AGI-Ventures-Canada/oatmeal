import { Fragment } from "react"
import Link from "next/link"
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type BreadcrumbItemType = {
  label: string
  href?: string
}

type PageHeaderProps = {
  breadcrumbs: BreadcrumbItemType[]
  title?: string
  description?: string
  actions?: React.ReactNode
}

function BreadcrumbEntry({ item }: { item: BreadcrumbItemType }) {
  if (item.href) {
    return (
      <BreadcrumbLink asChild>
        <Link href={item.href}>{item.label}</Link>
      </BreadcrumbLink>
    )
  }
  return <BreadcrumbPage>{item.label}</BreadcrumbPage>
}

function FullBreadcrumbs({ items }: { items: BreadcrumbItemType[] }) {
  return (
    <>
      {items.map((item, index) => (
        <Fragment key={item.label + index}>
          <BreadcrumbItem>
            <BreadcrumbEntry item={item} />
          </BreadcrumbItem>
          {index < items.length - 1 && <BreadcrumbSeparator />}
        </Fragment>
      ))}
    </>
  )
}

function CollapsedBreadcrumbs({ items }: { items: BreadcrumbItemType[] }) {
  const first = items[0]
  const last = items[items.length - 1]
  const middle = items.slice(1, -1)

  return (
    <>
      <BreadcrumbItem>
        <BreadcrumbEntry item={first} />
      </BreadcrumbItem>
      <BreadcrumbSeparator />
      <BreadcrumbItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon-sm" variant="ghost">
              <BreadcrumbEllipsis />
              <span className="sr-only">More</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuGroup>
              {middle.map((item) => (
                <DropdownMenuItem key={item.label} asChild={!!item.href}>
                  {item.href ? (
                    <Link href={item.href}>{item.label}</Link>
                  ) : (
                    item.label
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </BreadcrumbItem>
      <BreadcrumbSeparator />
      <BreadcrumbItem>
        <BreadcrumbEntry item={last} />
      </BreadcrumbItem>
    </>
  )
}

export function PageHeader({
  breadcrumbs,
  title,
  description,
  actions,
}: PageHeaderProps) {
  const shouldCollapse = breadcrumbs.length > 2

  return (
    <div className="space-y-4">
      {breadcrumbs.length > 0 && (
        <Breadcrumb>
          {shouldCollapse ? (
            <>
              <BreadcrumbList className="sm:hidden">
                <CollapsedBreadcrumbs items={breadcrumbs} />
              </BreadcrumbList>
              <BreadcrumbList className="hidden sm:flex">
                <FullBreadcrumbs items={breadcrumbs} />
              </BreadcrumbList>
            </>
          ) : (
            <BreadcrumbList>
              <FullBreadcrumbs items={breadcrumbs} />
            </BreadcrumbList>
          )}
        </Breadcrumb>
      )}

      {(title || description || actions) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {title && <h1 className="text-2xl font-bold">{title}</h1>}
            {description && (
              <p className="text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
        </div>
      )}
    </div>
  )
}
