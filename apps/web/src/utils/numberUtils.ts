export function coerceToFiniteNumber(
  value: number | string | null | undefined,
): number | null {
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  let sanitized = value.trim()
  if (sanitized.length === 0) {
    return null
  }

  sanitized = sanitized.replace(/\s+/g, '')
  sanitized = sanitized.replace(/%/g, '')

  const commaCount = (sanitized.match(/,/g) ?? []).length
  const dotCount = (sanitized.match(/\./g) ?? []).length

  if (commaCount > 0 && dotCount > 0) {
    if (sanitized.lastIndexOf(',') > sanitized.lastIndexOf('.')) {
      sanitized = sanitized.replace(/\./g, '')
      sanitized = sanitized.replace(/,/g, '.')
    } else {
      sanitized = sanitized.replace(/,/g, '')
    }
  } else if (commaCount > 0) {
    sanitized = sanitized.replace(/,/g, '.')
  }

  sanitized = sanitized.replace(/[^0-9.+-]/g, '')

  if (sanitized === '' || sanitized === '-' || sanitized === '+') {
    return null
  }

  const parsed = Number(sanitized)
  return Number.isFinite(parsed) ? parsed : null
}
