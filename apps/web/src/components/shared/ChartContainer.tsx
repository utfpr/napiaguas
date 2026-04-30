import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface ChartContainerProps {
  title: string
  description?: string
  children: React.ReactNode
  isEmpty?: boolean
  emptyMessage?: string
  isLoading?: boolean
  height?: number
  className?: string
}

// Wrapper para gráficos Recharts com título, loading e empty state.
export function ChartContainer({
  title,
  description,
  children,
  isEmpty = false,
  emptyMessage = 'Nenhum dado disponível para exibir',
  isLoading = false,
  height = 300,
  className,
}: ChartContainerProps) {
  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        {description && (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {description}
          </p>
        )}
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <Skeleton className="w-full" style={{ height: `${height}px` }} />
        ) : isEmpty ? (
          <div
            className="flex items-center justify-center rounded-lg border border-dashed border-neutral-300 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900/40"
            style={{ height: `${height}px` }}
          >
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {emptyMessage}
            </p>
          </div>
        ) : (
          <div className="w-full" style={{ height: `${height}px` }}>
            {children}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
