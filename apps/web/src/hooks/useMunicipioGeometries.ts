import { useEffect, useState } from 'react'
import type { FeatureCollection } from 'geojson'
import { fetchMunicipioGeometries } from '@/services/saude.service'

interface UseMunicipioGeometriesResult {
  geometries: FeatureCollection | null
  loading: boolean
  error: Error | null
  refetch: () => void
}

const CACHE_KEY = 'saude-municipio-geometries'
const CACHE_TIME_KEY = 'saude-municipio-geometries-time'
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 horas

/**
 * Hook para buscar geometrias de municípios do Paraná com cache em sessionStorage
 * Performance otimizada: geometrias são grandes, então cachear é essencial
 */
export function useMunicipioGeometries(): UseMunicipioGeometriesResult {
  const [geometries, setGeometries] = useState<FeatureCollection | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [refetchTrigger, setRefetchTrigger] = useState(0)

  useEffect(() => {
    const loadGeometries = async () => {
      setLoading(true)
      setError(null)

      try {
        // Tentar carregar do cache
        const cached = sessionStorage.getItem(CACHE_KEY)
        const cacheTime = sessionStorage.getItem(CACHE_TIME_KEY)

        if (cached && cacheTime) {
          const age = Date.now() - parseInt(cacheTime, 10)
          if (age < CACHE_TTL) {
            const parsedCache = JSON.parse(cached) as FeatureCollection
            setGeometries(parsedCache)
            setLoading(false)
            return
          }
        }

        // Cache miss ou expirado: buscar do backend
        const data = await fetchMunicipioGeometries(true)

        setGeometries(data)

        // Salvar no cache
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(data))
          sessionStorage.setItem(CACHE_TIME_KEY, Date.now().toString())
        } catch (cacheError) {
          // SessionStorage pode estar cheio, não é crítico
          console.warn('Falha ao salvar cache de geometrias:', cacheError)
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Erro desconhecido'))
      } finally {
        setLoading(false)
      }
    }

    void loadGeometries()
  }, [refetchTrigger])

  const refetch = () => {
    // Limpar cache
    sessionStorage.removeItem(CACHE_KEY)
    sessionStorage.removeItem(CACHE_TIME_KEY)
    setRefetchTrigger((prev) => prev + 1)
  }

  return { geometries, loading, error, refetch }
}
