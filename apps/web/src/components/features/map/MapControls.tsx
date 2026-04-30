import { cn } from '@/lib/utils'

interface MapControlsProps {
  onZoomIn: () => void
  onZoomOut: () => void
  onResetView?: () => void
  className?: string
  orientation?: 'vertical' | 'horizontal'
}

const BUTTON_BASE_CLASSES =
  'flex h-11 w-11 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-700 shadow-sm transition hover:bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800'

export function MapControls({
  onZoomIn,
  onZoomOut,
  onResetView,
  className,
  orientation = 'vertical',
}: MapControlsProps) {
  return (
    <div
      className={cn(
        'flex rounded-xl border-none bg-transparent p-2 dark:border-neutral-700/80 dark:bg-neutral-900/75',
        orientation === 'vertical' ? 'flex-col' : 'flex-row',
        'gap-2',
        className,
      )}
      role="group"
      aria-label="Controles do mapa"
    >
      <button
        type="button"
        aria-label="Aproximar mapa"
        className={BUTTON_BASE_CLASSES}
        onClick={onZoomIn}
      >
        <span aria-hidden="true" className="text-lg font-semibold">
          +
        </span>
      </button>
      <button
        type="button"
        aria-label="Afastar mapa"
        className={BUTTON_BASE_CLASSES}
        onClick={onZoomOut}
      >
        <span aria-hidden="true" className="text-lg font-semibold">
          −
        </span>
      </button>
      {onResetView ? (
        <button
          type="button"
          aria-label="Reiniciar posição do mapa"
          className={BUTTON_BASE_CLASSES}
          onClick={onResetView}
        >
          <span aria-hidden="true" className="text-sm font-semibold">
            ⤢
          </span>
        </button>
      ) : null}
    </div>
  )
}
