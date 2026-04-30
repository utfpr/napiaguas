import { useCallback } from 'react'

// Anuncia mensagens para screen readers via ARIA live region efêmera.
export function useAnnouncer() {
  const announce = useCallback(
    (message: string, politeness: 'polite' | 'assertive' = 'polite') => {
      const liveRegion = document.createElement('div')
      liveRegion.setAttribute('role', 'status')
      liveRegion.setAttribute('aria-live', politeness)
      liveRegion.setAttribute('aria-atomic', 'true')
      liveRegion.className = 'sr-only'
      liveRegion.textContent = message

      document.body.appendChild(liveRegion)

      setTimeout(() => {
        if (document.body.contains(liveRegion)) {
          document.body.removeChild(liveRegion)
        }
      }, 1000)
    },
    [],
  )

  return announce
}
