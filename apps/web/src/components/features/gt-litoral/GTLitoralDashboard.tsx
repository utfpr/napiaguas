import { useGTLitoralContext } from '@/contexts/GTLitoralContext'
import { DashboardCard, DashboardSkeleton, ErrorCard } from '@/components/shared'
import {
  ActivityIcon,
  RefreshCcwIcon,
  ShieldIcon,
  UsersIcon,
  WavesIcon,
} from '@/components/ui/icons'
import {
  GT_LITORAL_CARD_INDICATORS,
  GT_LITORAL_INDICATOR_MAP,
} from '@/lib/gt-litoral/constants'
import { CONSOLIDADO_VALUE_MAP, formatIndicatorValue } from '@/lib/gt-litoral/utils'

const ICON_COMPONENTS: Record<string, React.ComponentType<{ className?: string }>> = {
  waves: WavesIcon,
  activity: ActivityIcon,
  shield: ShieldIcon,
  users: UsersIcon,
}

export function GTLitoralDashboard() {
  const {
    consolidado,
    filteredConsolidado,
    isLoading,
    error,
    refetch,
    setSelectedIndicatorKey,
    openDetails,
    selectedIndicatorKey,
  } = useGTLitoralContext()

  if (isLoading) {
    return <DashboardSkeleton cards={4} />
  }

  if (error) {
    return (
      <ErrorCard
        title="Erro ao carregar indicadores"
        message={error.message}
        icon={<RefreshCcwIcon className="h-5 w-5" aria-hidden="true" />}
        onRetry={() => {
          void refetch({ ignoreCache: true })
        }}
        retryLabel="Tentar novamente"
      />
    )
  }

  const effectiveConsolidado = filteredConsolidado ?? consolidado

  return (
    <div className="grid gap-4" data-testid="gtlitoral-dashboard">
      {GT_LITORAL_CARD_INDICATORS.map((card) => {
        const option = GT_LITORAL_INDICATOR_MAP[card.key]
        const Icon = ICON_COMPONENTS[card.icon]
        const value = CONSOLIDADO_VALUE_MAP[card.key](effectiveConsolidado)
        const formatted = formatIndicatorValue(option, value)

        return (
          <DashboardCard
            key={card.key}
            icon={Icon ? <Icon className="h-6 w-6" aria-hidden="true" /> : null}
            label={option.label}
            value={formatted}
            description={option.description ?? 'Monitoramento consolidado pelos dados do GT Litoral.'}
            gtType="litoral"
            selected={selectedIndicatorKey === card.key}
            onSelectMap={() => setSelectedIndicatorKey(card.key)}
            onViewDetails={() => openDetails()}
            selectMapLabel="Usar no mapa"
            viewDetailsLabel="Ver detalhes"
          />
        )
      })}
    </div>
  )
}
