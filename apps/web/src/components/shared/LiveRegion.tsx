import { useEffect, useRef } from 'react'

interface LiveRegionProps {
  message: string
  politeness?: 'polite' | 'assertive'
  clearAfter?: number
  onClear?: () => void
}

// Região ARIA live para anúncios de screen reader (feedback dinâmico).
export function LiveRegion({
  message,
  politeness = 'polite',
  clearAfter,
  onClear,
}: LiveRegionProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    if (clearAfter && onClear) {
      timerRef.current = setTimeout(() => {
        onClear()
      }, clearAfter)
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [clearAfter, onClear, message])

  if (!message) {
    return null
  }

  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  )
}
