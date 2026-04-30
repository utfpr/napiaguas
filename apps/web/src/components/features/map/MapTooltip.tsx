import { memo, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface MapTooltipProps {
  x: number
  y: number
  visible: boolean
  children: ReactNode
  className?: string
}

const TOOLTIP_MAX_WIDTH = 260
const TOOLTIP_OFFSET_X = 16
const TOOLTIP_OFFSET_Y = 16

export const MapTooltip = memo(function MapTooltip({
  x,
  y,
  visible,
  children,
  className,
}: MapTooltipProps) {
  if (!visible) {
    return null
  }

  return (
    <div
      role="tooltip"
      aria-live="polite"
      className={cn(
        'pointer-events-none absolute rounded-lg border border-neutral-200 bg-white/95 px-3 py-2.5 text-xs shadow-xl backdrop-blur-sm transition-opacity duration-150 ease-out dark:border-neutral-700 dark:bg-neutral-800/95 dark:text-neutral-200',
        className,
      )}
      style={{
        left: `${x + TOOLTIP_OFFSET_X}px`,
        top: `${y - TOOLTIP_OFFSET_Y}px`,
        maxWidth: TOOLTIP_MAX_WIDTH,
        transform: 'translateY(-100%)',
        opacity: 1,
      }}
    >
      {children}
    </div>
  )
})
