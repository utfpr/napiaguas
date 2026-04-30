import { useState, useEffect, useRef } from 'react'
import { Drawer } from 'vaul'
import { ChevronUpIcon } from '@/components/ui/icons'
import { cn } from '@/lib/utils'
import { IndicatorsSidebar } from './IndicatorsSidebar'
import { useAppStore } from '@/stores/useAppStore'

interface MobileIndicatorsSheetProps {
  workgroupId: string
  className?: string
}

/**
 * Componente responsivo que renderiza:
 * - Desktop (≥1024px): IndicatorsSidebar tradicional (layout atual mantido)
 * - Mobile/Tablet (<1024px): Bottom Sheet flutuante com sidebar interno
 */
export function MobileIndicatorsSheet({
  workgroupId,
  className,
}: MobileIndicatorsSheetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const selectedIndicatorId = useAppStore(
    (state) => state.selectedIndicatorIdByWorkgroup[workgroupId] ?? null,
  )
  const previousIndicatorIdRef = useRef<string | null>(null)

  // Fechar sheet automaticamente quando um indicador for selecionado em mobile
  useEffect(() => {
    // Só fechar se o indicador MUDOU (não apenas se existe)
    if (
      isOpen &&
      selectedIndicatorId &&
      selectedIndicatorId !== previousIndicatorIdRef.current
    ) {
      // Atualizar referência
      previousIndicatorIdRef.current = selectedIndicatorId

      // Pequeno delay para dar feedback visual antes de fechar
      const timer = setTimeout(() => {
        setIsOpen(false)
      }, 300)
      return () => clearTimeout(timer)
    }

    // Atualizar referência quando mudar
    if (selectedIndicatorId !== previousIndicatorIdRef.current) {
      previousIndicatorIdRef.current = selectedIndicatorId
    }
  }, [selectedIndicatorId, isOpen])

  return (
    <>
      {/* DESKTOP: Sidebar tradicional (≥1024px) - Layout atual mantido sem quebras */}
      <div className="hidden lg:block lg:flex-shrink-0">
        <IndicatorsSidebar workgroupId={workgroupId} className="h-full" />
      </div>

      {/* MOBILE/TABLET: Bottom Sheet (<1024px) */}
      <Drawer.Root
        open={isOpen}
        onOpenChange={setIsOpen}
        modal={false}
        dismissible={true}
      >
        {/* Trigger button - Visível apenas em mobile */}
        <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden">
          <Drawer.Trigger asChild>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className={cn(
                'flex w-full items-center justify-center gap-2',
                'border-t border-neutral-200 bg-white px-4 py-4',
                'text-sm font-medium text-neutral-700',
                'shadow-[0_-2px_10px_rgba(0,0,0,0.1)]',
                'transition-all hover:bg-neutral-50',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
              )}
              aria-label={isOpen ? 'Recolher indicadores' : 'Expandir indicadores'}
            >
              <ChevronUpIcon
                className={cn(
                  'h-5 w-5 transition-transform duration-300',
                  isOpen && 'rotate-180',
                )}
              />
              <span>Indicadores</span>
            </button>
          </Drawer.Trigger>
        </div>

        {/* Drawer Portal - Apenas mobile */}
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-40 bg-black/10 lg:hidden" />
          <Drawer.Content
            className={cn(
              'fixed bottom-0 left-0 right-0 z-50',
              'flex max-h-[90vh] flex-col rounded-t-xl',
              'border-t border-neutral-200 bg-white',
              'shadow-[0_-4px_20px_rgba(0,0,0,0.15)]',
              'lg:hidden', // Esconder em desktop
              className,
            )}
          >
            {/* Handle - Indicador visual de arrastar */}
            <div className="flex items-center justify-center py-3">
              <div className="h-1.5 w-12 rounded-full bg-neutral-300" />
            </div>

            {/* Header */}
            <div className="border-b border-neutral-200 px-4 pb-3">
              <Drawer.Title className="text-lg font-semibold text-neutral-900">
                Selecione um Indicador
              </Drawer.Title>
              <Drawer.Description className="mt-1 text-sm text-neutral-600">
                Navegue pela hierarquia de índices e indicadores
              </Drawer.Description>
            </div>

            {/* Sidebar Content com scroll */}
            <div className="flex-1 overflow-y-auto">
              <IndicatorsSidebar
                workgroupId={workgroupId}
                className="h-full border-0"
              />
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  )
}
