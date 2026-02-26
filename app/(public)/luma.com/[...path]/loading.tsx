import { Skeleton } from "@/components/ui/skeleton"

export default function LumaImportLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <div className="order-2 md:order-1 flex flex-col gap-4">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-10 w-3/4" />
          <div className="flex flex-col gap-1">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-36" />
          </div>
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="order-1 md:order-2">
          <Skeleton className="aspect-square w-full rounded-xl" />
        </div>
      </div>
    </div>
  )
}
