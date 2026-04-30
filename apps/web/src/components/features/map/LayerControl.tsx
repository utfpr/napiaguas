import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface LayerControlItem {
  id: string
  label: string
  visible: boolean
  metadata?: Record<string, unknown>
}

interface LayerControlProps {
  layers: LayerControlItem[]
  onToggle: (layerId: string, visible: boolean) => void
  className?: string
}

export function LayerControl({ layers, onToggle, className }: LayerControlProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (layers.length === 0) {
    return null
  }

  return (
    <div
      className={cn(
        'rounded-xl border border-neutral-200/80 bg-white/10 shadow-lg backdrop-blur dark:border-neutral-800/60 dark:bg-neutral-900/80',
        className,
      )}
      role="group"
      aria-label="Selecionar camadas do mapa"
    >
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between p-4 transition rounded-xl hover:bg-neutral-50/50 dark:hover:bg-neutral-800/50"
        aria-expanded={isExpanded}
        aria-controls="layer-control-content"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Camadas
        </p>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
        )}
      </button>

      <div
        id="layer-control-content"
        className={cn(
          'overflow-hidden transition-all duration-300 ease-in-out',
          isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        <ul className="space-y-3 p-4 pt-0">
          {layers.map((layer) => (
            <li key={layer.id} className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                  {layer.label}
                </span>
                {layer.metadata?.description ? (
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {String(layer.metadata.description)}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={layer.visible}
                aria-label={`Alternar camada ${layer.label}`}
                onClick={() => {
                  onToggle(layer.id, !layer.visible)
                }}
                className={cn(
                  'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full border border-neutral-300 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:border-neutral-700',
                  layer.visible
                    ? 'bg-sky-500 focus-visible:ring-sky-500'
                    : 'bg-neutral-200 focus-visible:ring-neutral-500 dark:bg-neutral-700',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'inline-block h-4 w-4 transform rounded-full bg-white shadow transition dark:bg-neutral-200',
                    layer.visible ? 'translate-x-5' : 'translate-x-1',
                  )}
                />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
