import { useState } from 'react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/ui/icons'
import { Skeleton } from '@/components/ui/skeleton'
import { TooltipProvider } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useIndicators } from '@/hooks/useIndicators'
import { useAppStore } from '@/stores/useAppStore'

import { IndicatorTreeNode } from './IndicatorTreeNode'

interface IndicatorsSidebarProps {
  workgroupId: string
  className?: string
}

export function IndicatorsSidebar({ workgroupId, className }: IndicatorsSidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const { data: indicators, isLoading, error, refetch } = useIndicators(workgroupId)
  const selectedIndicatorId = useAppStore(
    (state) => state.selectedIndicatorIdByWorkgroup[workgroupId] ?? null,
  )
  const setSelectedIndicator = useAppStore((state) => state.setSelectedIndicator)
  const handleSelect = (indicatorId: string | null) => {
    setSelectedIndicator(workgroupId, indicatorId)
  }

  const showTree = !collapsed

  return (
    <TooltipProvider>
      <aside
        className={cn(
          'flex h-full min-h-0 max-h-screen flex-shrink-0 flex-col overflow-hidden border-r border-neutral-200 bg-white transition-all duration-300 dark:border-neutral-800 dark:bg-neutral-950',
          // Mobile: sempre expandido (w-full) | Desktop: w-14 (colapsado) ou w-96 (expandido)
          'w-full lg:w-auto',
          collapsed ? 'lg:w-14' : 'lg:w-80',
          className,
        )}
        aria-label="Navegação hierárquica de indicadores"
      >
      <header className="flex items-center justify-between gap-2 border-b border-neutral-200 px-3 py-3 dark:border-neutral-800 lg:border-b">
        {!collapsed ? (
          <div>
            <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 lg:block hidden">
              Indicadores
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 lg:block hidden">
              Explore índices, subíndices e indicadores
            </p>
          </div>
        ) : (
          <span className="sr-only">Indicadores</span>
        )}
        {/* Botão de colapsar visível apenas em desktop */}
        <Button
          type="button"
          size="sm"
          className="hidden h-8 w-8 p-0 lg:flex"
          variant="ghost"
          aria-label={collapsed ? 'Expandir sidebar de indicadores' : 'Colapsar sidebar de indicadores'}
          onClick={() => setCollapsed((previous) => !previous)}
        >
          {collapsed ? (
            <ChevronRightIcon className="h-4 w-4" />
          ) : (
            <ChevronLeftIcon className="h-4 w-4" />
          )}
        </Button>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {isLoading ? (
          <SidebarSkeleton />
        ) : error ? (
          <div className="p-3">
            <Alert variant="destructive">
              <AlertTitle>Erro ao carregar indicadores</AlertTitle>
              <AlertDescription className="flex flex-col gap-3">
                <span className="text-sm text-neutral-600 dark:text-neutral-300">
                  Não foi possível carregar a hierarquia de indicadores.
                </span>
                <Button onClick={() => void refetch()} size="sm" variant="outline">
                  Tentar novamente
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        ) : showTree ? (
          <nav role="tree" className="space-y-1 px-2 py-3">
            {indicators && indicators.length > 0 ? (
              indicators.map((node) => (
                <IndicatorTreeNode
                  key={node.id}
                  node={node}
                  selectedId={selectedIndicatorId}
                  onSelect={handleSelect}
                />
              ))
            ) : (
              <Card className="border-dashed border-neutral-200 bg-neutral-50/60 p-4 text-center text-sm text-neutral-500 shadow-none dark:border-neutral-800 dark:bg-neutral-900/50 dark:text-neutral-400">
                Nenhum indicador disponível.
              </Card>
            )}
          </nav>
        ) : (
          <div className="flex h-full items-center justify-center px-2 py-4">
            <span className="rotate-90 text-[0.65rem] font-medium uppercase tracking-wide text-neutral-400">
              Indicadores
            </span>
          </div>
        )}
      </div>
      </aside>
    </TooltipProvider>
  )
}

function SidebarSkeleton() {
  return (
    <div className="space-y-2 px-3 py-4">
      <Skeleton className="h-6 w-36" />
      <Skeleton className="h-4 w-28" />
      <div className="pt-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="mb-2 h-9 w-full last:mb-0" />
        ))}
      </div>
    </div>
  )
}
