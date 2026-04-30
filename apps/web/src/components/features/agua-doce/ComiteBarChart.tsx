import { useEffect, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

interface ChartData {
  comite_nome: string
  mean_value: number
  count: number
  min_value: number
  max_value: number
}

interface ComiteBarChartProps {
  data: ChartData[]
  metadata: {
    total_comites: number
    indicator: {
      id: string
      name: string
      unit: string | null
    } | null
  }
}

// Paleta de cores distintas para cada comitê
const COMITE_COLORS = [
  '#0099CC',
  '#00CC66',
  '#FFD700',
  '#FB8500',
  '#D62828',
  '#8338EC',
  '#3A86FF',
  '#FF006E',
  '#06D6A0',
  '#118AB2',
  '#073B4C',
  '#EF476F',
]

export function ComiteBarChart({ data, metadata }: ComiteBarChartProps) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const height = Math.max(400, data.length * (isMobile ? 50 : 60))

  // Formata nomes substituindo underscores por espaços
  const formattedData = data.map((item) => ({
    ...item,
    comite_nome: item.comite_nome.replace(/_/g, ' '),
  }))

  // Configurações responsivas
  const chartMargin = isMobile
    ? { top: 10, right: 10, left: 10, bottom: 10 }
    : { top: 20, right: 30, left: 150, bottom: 20 }
  const yAxisWidth = isMobile ? 100 : 140
  const tickFontSize = isMobile ? 10 : 12

  return (
    <div
      className="w-full"
      role="img"
      aria-label={`Gráfico de barras: ${metadata.indicator?.name || 'Indicador'} por comitê de bacia`}
      aria-describedby="chart-description"
    >
      <p id="chart-description" className="sr-only">
        Gráfico de barras horizontal mostrando a média do indicador{' '}
        {metadata.indicator?.name || ''} para cada comitê de bacia do Paraná.
        Total de {metadata.total_comites} comitês.
      </p>

      {/* Container responsivo */}
      <div className="overflow-x-auto md:overflow-visible">
        <div style={{ minWidth: '320px' }}>
          <ResponsiveContainer width="100%" height={height}>
            <BarChart
              data={formattedData}
              layout="vertical"
              margin={chartMargin}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                type="number"
                domain={[0, 1]}
                tickFormatter={(value: number) => value.toFixed(2)}
                aria-label="Valor médio"
                tick={{ fontSize: tickFontSize }}
              />
              <YAxis
                type="category"
                dataKey="comite_nome"
                width={yAxisWidth}
                tick={{ fontSize: tickFontSize }}
                aria-label="Comitê de bacia"
                tickFormatter={(value: string) =>
                  isMobile && value.length > 15 ? `${value.substring(0, 15)}...` : value
                }
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null
                  const item = payload[0].payload as ChartData
                  return (
                    <div
                      className="bg-white p-3 rounded shadow-lg border"
                      role="tooltip"
                    >
                      <p className="font-semibold">{item.comite_nome}</p>
                      <p>Média: {item.mean_value.toFixed(4)}</p>
                      <p>Subbacias: {item.count}</p>
                      <p>Mín: {item.min_value.toFixed(4)}</p>
                      <p>Máx: {item.max_value.toFixed(4)}</p>
                    </div>
                  )
                }}
              />
              <Bar
                dataKey="mean_value"
                name={metadata.indicator?.name || 'Valor'}
              >
                {formattedData.map((entry, index) => (
                  <Cell
                    key={entry.comite_nome}
                    fill={COMITE_COLORS[index % COMITE_COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Legenda */}
      <div
        className="flex flex-wrap gap-1 sm:gap-2 mt-4 justify-center px-2"
        role="list"
        aria-label="Legenda dos comitês"
      >
        {formattedData.map((item, index) => (
          <div
            key={item.comite_nome}
            className="flex items-center gap-1"
            role="listitem"
          >
            <div
              className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded flex-shrink-0"
              style={{
                backgroundColor: COMITE_COLORS[index % COMITE_COLORS.length],
              }}
              aria-hidden="true"
            />
            <span className="text-[10px] sm:text-xs">
              {item.comite_nome.length > (isMobile ? 12 : 20)
                ? `${item.comite_nome.substring(0, isMobile ? 12 : 20)}...`
                : item.comite_nome}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
