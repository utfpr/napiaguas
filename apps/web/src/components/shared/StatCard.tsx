import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  description?: string
  isLoading?: boolean
  trend?: {
    value: number
    direction: 'up' | 'down'
  }
  className?: string
}

export function StatCard({
  icon,
  label,
  value,
  description,
  isLoading = false,
  trend,
  className,
}: StatCardProps) {
  if (isLoading) {
    return (
      <Card className={cn('p-6', className)}>
        <div className="flex items-start gap-4">
          <Skeleton className="h-12 w-12 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card
      className={cn(
        'group p-6 transition-all duration-200 hover:shadow-md',
        className,
      )}
    >
      <div className="flex items-start gap-4">
        <div className="rounded-lg bg-primary/10 p-3 text-primary-dark transition-colors duration-200 group-hover:bg-primary/20">
          {icon}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-neutral-600">{label}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold text-neutral-900">{value}</p>
            {trend && (
              <span
                className={cn(
                  'text-sm font-medium',
                  trend.direction === 'up' ? 'text-secondary' : 'text-error',
                )}
                aria-label={`Tendência ${trend.direction === 'up' ? 'positiva' : 'negativa'} de ${trend.value}%`}
              >
                {trend.direction === 'up' ? '↑' : '↓'} {trend.value}%
              </span>
            )}
          </div>
          {description && (
            <p className="mt-1 text-xs text-neutral-500">{description}</p>
          )}
        </div>
      </div>
    </Card>
  )
}
