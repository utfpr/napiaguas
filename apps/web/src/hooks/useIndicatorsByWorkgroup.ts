import { useState, useEffect } from 'react'
import { indicatorsService } from '@/services/indicators.service'
import type { IndicatorNode } from '@/types/indicators'

/**
 * Hook para buscar indicadores de um grupo de trabalho
 */
export function useIndicatorsByWorkgroup(workgroup: string | '') {
  const [indicators, setIndicators] = useState<IndicatorNode[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!workgroup) {
      setIndicators([])
      return
    }

    const controller = new AbortController()
    setIsLoading(true)
    setError(null)

    indicatorsService
      .getIndicatorsByWorkgroup(workgroup, { signal: controller.signal })
      .then((tree) => {
        const flatIndicators = flattenIndicatorTree(tree)
        setIndicators(flatIndicators)
        setIsLoading(false)
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setError(err)
          setIsLoading(false)
        }
      })

    return () => controller.abort()
  }, [workgroup])

  return { indicators, isLoading, error }
}

/**
 * Achata a árvore de indicadores para obter apenas os indicadores folha
 */
function flattenIndicatorTree(tree: IndicatorNode[]): IndicatorNode[] {
  const result: IndicatorNode[] = []

  function traverse(nodes: IndicatorNode[]) {
    for (const node of nodes) {
      // Se for um indicador folha (type: 'indicator'), adiciona à lista
      if (node.type === 'indicator') {
        result.push(node)
      }
      // Recursivamente processa os filhos
      if (node.children && node.children.length > 0) {
        traverse(node.children)
      }
    }
  }

  traverse(tree)
  return result
}
