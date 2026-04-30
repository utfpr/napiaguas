import { Button } from '@/components/ui/button'
import { FilterIcon } from '@/components/ui/icons'
import { cn } from '@/lib/utils'

type GTType = 'litoral' | 'saude' | 'agua' | 'transporte'

interface FilterPanelProps {
  title?: string
  description?: string
  gtType?: GTType
  filtersCount: number
  onResetFilters: () => void
  children: React.ReactNode
  className?: string
}

const GT_COLORS: Record<GTType, { icon: string; badge: string }> = {
  litoral: {
    icon: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
    badge: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  },
  saude: {
    icon: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  agua: {
    icon: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  },
  transporte: {
    icon: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  },
}

export function FilterPanel({
  title = 'Filtros avançados',
  description,
  gtType = 'litoral',
  filtersCount,
  onResetFilters,
  children,
  className,
}: FilterPanelProps) {
  const colors = GT_COLORS[gtType]

  return (
    <section
      className={cn(
        'rounded-xl border border-neutral-200 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/60',
        className,
      )}
      data-testid="filter-panel"
    >
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-full',
              colors.icon,
            )}
          >
            <FilterIcon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              {title}
            </h2>
            {description && (
              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                {description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {filtersCount > 0 && (
            <>
              <span
                className={cn(
                  'inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-medium',
                  colors.badge,
                )}
                aria-label={`${filtersCount} filtro${filtersCount > 1 ? 's' : ''} ativo${filtersCount > 1 ? 's' : ''}`}
              >
                {filtersCount}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={onResetFilters}
                className="text-xs"
              >
                Limpar tudo
              </Button>
            </>
          )}
        </div>
      </header>

      {children}
    </section>
  )
}
