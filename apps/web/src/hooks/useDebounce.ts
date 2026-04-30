import { useEffect, useState } from 'react'

/**
 * Retorna um valor apenas após o intervalo configurado sem novas alterações.
 * Útil para buscas e filtros dependentes de chamadas pesadas.
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      window.clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}
