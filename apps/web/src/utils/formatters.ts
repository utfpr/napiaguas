const NUMBER_FORMATTER = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

export function formatIndicatorValue(
  value: number | null | undefined,
  unit?: string | null,
): string {
  if (value === null || value === undefined) {
    return 'Sem dados'
  }

  const numericValue = typeof value === 'number' ? value : Number(value)

  if (!Number.isFinite(numericValue)) {
    return 'Sem dados'
  }

  const formatted = NUMBER_FORMATTER.format(numericValue)

  if (unit && unit.trim().length > 0) {
    return `${formatted} ${unit.trim()}`
  }

  return formatted
}

