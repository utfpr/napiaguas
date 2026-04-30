import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useIndicators } from '@/hooks/useIndicators'
import type { IndicatorNode } from '@/types/indicators'

interface IndicatorSelectorProps {
  value: string | null
  onChange: (value: string) => void
}

interface FlatIndicator {
  id: string // código para exibição
  uuid: string // UUID para API
  name: string
  level: 'index' | 'subindex' | 'indicator'
}

export function IndicatorSelector({ value, onChange }: IndicatorSelectorProps) {
  const { data: indicators, isLoading } = useIndicators('agua-doce')

  if (isLoading) {
    return <Skeleton className="h-10 w-full sm:w-80 md:w-96" />
  }

  // Flatten hierarquia para select
  const flatIndicators = flattenIndicators(indicators || [])

  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger className="w-full sm:w-80 md:w-96" aria-label="Selecionar indicador">
        <SelectValue placeholder="Selecione um indicador" />
      </SelectTrigger>
      <SelectContent>
        {flatIndicators.map((indicator) => (
          <SelectItem
            key={indicator.uuid}
            value={indicator.uuid}
            className={indicator.level === 'indicator' ? 'pl-8' : indicator.level === 'subindex' ? 'pl-4' : 'font-medium'}
          >
            {indicator.level === 'indicator' && '↳ '}
            {indicator.level === 'subindex' && '• '}
            {indicator.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/**
 * Achata a hierarquia de indicadores para exibição em dropdown
 * Usa tipo IndicatorNode de @/types/indicators
 * Usa uuid para chamadas à API (backend espera UUID, não código)
 */
function flattenIndicators(indicators: IndicatorNode[]): FlatIndicator[] {
  const result: FlatIndicator[] = []

  function traverse(nodes: IndicatorNode[], level: 'index' | 'subindex' | 'indicator' = 'index') {
    for (const node of nodes) {
      // Usa uuid se disponível, senão usa id como fallback
      const uuid = node.uuid || node.id
      result.push({
        id: node.id,
        uuid,
        name: node.name,
        level: node.type === 'index' ? 'index' : node.type === 'subindex' ? 'subindex' : 'indicator',
      })

      if (node.children && node.children.length > 0) {
        const nextLevel: 'index' | 'subindex' | 'indicator' =
          level === 'index' ? 'subindex' : 'indicator'
        traverse(node.children, nextLevel)
      }
    }
  }

  traverse(indicators)
  return result
}
