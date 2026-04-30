export function formatNumber(
  value: number | null | undefined,
  decimals: number = 0,
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A'
  }

  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatPercent(
  value: number | null | undefined,
  decimals: number = 1,
  asDecimal: boolean = false,
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A'
  }

  const percentage = asDecimal ? value * 100 : value

  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    style: 'percent',
  }).format(percentage / 100)
}

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A'
  }

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatCompactNumber(
  value: number | null | undefined,
  decimals: number = 1,
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A'
  }

  return new Intl.NumberFormat('pt-BR', {
    notation: 'compact',
    compactDisplay: 'short',
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return 'N/A'

  const dateObj = typeof date === 'string' ? new Date(date) : date

  if (isNaN(dateObj.getTime())) {
    return 'Data inválida'
  }

  return new Intl.DateTimeFormat('pt-BR').format(dateObj)
}

export function formatDateTime(
  date: string | Date | null | undefined,
): string {
  if (!date) return 'N/A'

  const dateObj = typeof date === 'string' ? new Date(date) : date

  if (isNaN(dateObj.getTime())) {
    return 'Data inválida'
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(dateObj)
}

export function formatPeriodo(periodo: string | number): string {
  return String(periodo)
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text
  }

  return text.slice(0, maxLength - 3) + '...'
}

// Converte nomes de município para Title Case preservando conectivos em minúsculas ("São José dos Pinhais").
export function formatMunicipioName(name: string): string {
  if (!name) return ''

  const lowercase = ['de', 'da', 'do', 'das', 'dos', 'e']

  return name
    .toLowerCase()
    .split(' ')
    .map((word) => {
      if (lowercase.includes(word)) {
        return word
      }

      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(' ')
}
