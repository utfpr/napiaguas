export const brandColors = {
  primary: '#0099CC',
  primaryDark: '#006B8F',
  primaryLight: '#33B5E5',
  secondary: '#00CC66',
  secondaryLight: '#4DD599',
  accent: '#FFD700',
} as const

export const semanticColors = {
  success: '#4DD599',
  warning: '#FB8500',
  error: '#D62828',
  info: '#33B5E5',
} as const

export const neutralPalette = {
  50: '#F9FAFB',
  100: '#F5F5F5',
  200: '#E5E7EB',
  300: '#CCCCCC',
  400: '#9CA3AF',
  500: '#6B7280',
  600: '#4B5563',
  700: '#374151',
  800: '#1F2937',
  900: '#333333',
} as const

export const vulnerabilityScale = {
  low: '#00CC66',
  medium: '#FFD700',
  high: '#FB8500',
  critical: '#D62828',
  noData: neutralPalette[200],
} as const

export const mapLegendColors = vulnerabilityScale

export type MapLegendColorKey = Exclude<keyof typeof vulnerabilityScale, 'noData'> | 'noData'
