import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface MapSkeletonProps {
  className?: string
}

export function MapSkeleton({ className }: MapSkeletonProps) {
  return (
    <div
      className={cn(
        'flex h-full w-full flex-col justify-between rounded-xl border border-neutral-200 bg-neutral-50 p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900',
        className,
      )}
    >
      <Skeleton className="h-8 w-48" />
      <div className="flex flex-1 items-center justify-center">
        <Skeleton className="h-32 w-32 rounded-full" />
      </div>
      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-xl" />
        <Skeleton className="h-12 w-12 rounded-xl" />
      </div>
    </div>
  )
}
