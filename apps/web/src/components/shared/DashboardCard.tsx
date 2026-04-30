import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type GTType = 'litoral' | 'saude' | 'agua' | 'transporte'

interface DashboardCardProps {
  icon: React.ReactNode
  label: string
  value: string
  description?: string
  gtType?: GTType
  selected?: boolean
  onSelectMap?: () => void
  onViewDetails?: () => void
  selectMapLabel?: string
  viewDetailsLabel?: string
  className?: string
}

const GT_ICON_COLORS: Record<GTType, string> = {
  litoral: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  saude: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  agua: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  transporte: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
}

// Card de indicador reutilizável nos dashboards dos GTs.
export function DashboardCard({
  icon,
  label,
  value,
  description,
  gtType = 'litoral',
  selected = false,
  onSelectMap,
  onViewDetails,
  selectMapLabel = 'Usar no mapa',
  viewDetailsLabel = 'Ver detalhes',
  className,
}: DashboardCardProps) {
  const iconColorClass = GT_ICON_COLORS[gtType]

  return (
    <Card
      className={cn(
        'transition-shadow duration-200 hover:shadow-lg',
        className,
      )}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex-1">
          <p className="text-xs uppercase tracking-wide text-neutral-500">
            {label}
          </p>
          <CardTitle className="text-3xl font-semibold">{value}</CardTitle>
        </div>
        <div
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-full',
            iconColorClass,
          )}
        >
          {icon}
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {description && (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {description}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {onSelectMap && (
            <Button
              variant={selected ? 'default' : 'outline'}
              size="sm"
              onClick={onSelectMap}
              aria-pressed={selected}
            >
              {selectMapLabel}
            </Button>
          )}
          {onViewDetails && (
            <Button variant="ghost" size="sm" onClick={onViewDetails}>
              {viewDetailsLabel}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
