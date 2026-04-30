export function getVulnerabilityColor(normalizedValue: number | null): string {
  if (normalizedValue === null || normalizedValue === undefined) {
    return '#F5F5F5'
  }

  if (normalizedValue <= 0.25) {
    return '#00CC66'
  }

  if (normalizedValue <= 0.50) {
    return '#FFD700'
  }

  if (normalizedValue <= 0.75) {
    return '#FB8500'
  }

  return '#D62828'
}
