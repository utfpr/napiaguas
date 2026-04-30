import { memo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface IndicatorChartDatum {
  label: string
  value: number | null
}

type TooltipFormatterValue = string | number | Array<string | number> | null | undefined

interface IndicatorChartProps {
  title: string
  data: IndicatorChartDatum[]
  unit?: string
  description?: string
  variant?: 'bar' | 'line'
  loading?: boolean
}

export const IndicatorChart = memo(function IndicatorChart({
  title,
  data,
  unit,
  description,
  variant = 'bar',
  loading = false,
}: IndicatorChartProps) {
  const hasValues = data.some((datum) => typeof datum.value === 'number')

  const formatTooltipValue = (value: TooltipFormatterValue): [string, string] => {
    if (typeof value === 'number') {
      const formattedValue = `${value.toFixed(2)}${unit ? ` ${unit}` : ''}`
      return [formattedValue, title]
    }
    return ['Sem dados', title]
  }

  return (
    <Card className="h-full">
      <CardHeader className="space-y-1">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        {description ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{description}</p>
        ) : null}
      </CardHeader>
      <CardContent className="h-64">
        {loading ? (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : hasValues ? (
          <ResponsiveContainer width="100%" height="100%">
            {variant === 'line' ? (
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip formatter={formatTooltipValue} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#0ea5e9"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
              </LineChart>
            ) : (
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip formatter={formatTooltipValue} />
                <Bar dataKey="value" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-neutral-500 dark:text-neutral-400">
            <p>Sem dados suficientes para renderizar este gráfico.</p>
            {description ? <p className="text-xs text-neutral-400">{description}</p> : null}
          </div>
        )}
      </CardContent>
    </Card>
  )
})
