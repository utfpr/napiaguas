import { Link } from 'react-router-dom'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { cn } from '@/lib/utils'

type GTType = 'litoral' | 'saude' | 'agua' | 'transporte'

interface PageHeaderProps {
  title: string
  description?: string
  icon?: React.ReactNode
  breadcrumbs?: Array<{ label: string; href?: string }>
  actions?: React.ReactNode
  gtType?: GTType
  className?: string
}

const GT_ACCENT_COLORS: Record<GTType, string> = {
  litoral: 'text-sky-700 dark:text-sky-300',
  saude: 'text-emerald-700 dark:text-emerald-300',
  agua: 'text-blue-700 dark:text-blue-300',
  transporte: 'text-orange-700 dark:text-orange-300',
}

export function PageHeader({
  title,
  description,
  icon,
  breadcrumbs,
  actions,
  gtType,
  className,
}: PageHeaderProps) {
  const accentColorClass = gtType ? GT_ACCENT_COLORS[gtType] : ''

  return (
    <header className={cn('space-y-4', className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1

              return (
                <BreadcrumbItem key={index}>
                  {isLast ? (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  ) : (
                    <>
                      <BreadcrumbLink asChild>
                        <Link to={crumb.href || '#'}>{crumb.label}</Link>
                      </BreadcrumbLink>
                      <BreadcrumbSeparator />
                    </>
                  )}
                </BreadcrumbItem>
              )
            })}
          </BreadcrumbList>
        </Breadcrumb>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          {icon && (
            <div
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10',
                accentColorClass,
              )}
            >
              {icon}
            </div>
          )}

          <div>
            <h1
              className={cn(
                'text-3xl font-bold text-neutral-900 dark:text-neutral-100 md:text-4xl',
                gtType && accentColorClass,
              )}
            >
              {title}
            </h1>
            {description && (
              <p className="mt-2 text-lg text-neutral-600 dark:text-neutral-400">
                {description}
              </p>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex flex-wrap gap-2 sm:flex-nowrap">{actions}</div>
        )}
      </div>
    </header>
  )
}
