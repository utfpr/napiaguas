import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface DashboardSkeletonProps {
  cards?: number
  className?: string
}

export function DashboardSkeleton({
  cards = 4,
  className,
}: DashboardSkeletonProps) {
  return (
    <div className={cn('grid gap-4', className)} data-testid="dashboard-skeleton">
      {Array.from({ length: cards }, (_, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-10 rounded-full" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-24" />
            <Skeleton className="mt-2 h-4 w-3/4" />
            <div className="mt-4 flex gap-2">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-24" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
