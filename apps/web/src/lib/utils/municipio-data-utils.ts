import type { FeatureCollection } from 'geojson'
import type { IndicatorValue } from '@/services/saude.service'
import { getVulnerabilityColor } from '@/lib/colors'

/**
 * Faz join de geometrias de municípios com valores de indicadores
 * Performance: O(n + m) onde n = geometrias, m = valores
 *
 * @param geometries - GeoJSON de municípios (399 features)
 * @param values - Array de valores de indicadores
 * @returns GeoJSON atualizado com propriedades de valor e cor
 */
export function joinMunicipiosWithValues(
  geometries: FeatureCollection,
  values: IndicatorValue[],
): FeatureCollection {
  // Criar mapa para lookup O(1)
  const valuesMap = new Map(values.map((v) => [v.codigo_municipio, v]))

  return {
    ...geometries,
    features: geometries.features.map((feature) => {
      const codigo = feature.properties?.codigo || feature.id

      const indicatorValue = valuesMap.get(String(codigo))

      return {
        ...feature,
        properties: {
          ...feature.properties,
          value: indicatorValue?.value ?? null,
          normalized_value: indicatorValue?.normalized_value ?? null,
          color: getVulnerabilityColor(indicatorValue?.normalized_value ?? null),
        },
      }
    }),
  }
}

/**
 * Calcula estatísticas dos valores de indicadores
 * Útil para validação, debug e exibição de resumos
 *
 * @param values - Array de valores de indicadores
 * @returns Objeto com estatísticas (total, com dados, sem dados, min, max, média)
 */
export function getIndicatorStats(values: IndicatorValue[]) {
  const validValues = values
    .map((v) => v.normalized_value)
    .filter((v): v is number => v !== null)

  if (validValues.length === 0) {
    return {
      total: values.length,
      withData: 0,
      withoutData: values.length,
      min: null,
      max: null,
      avg: null,
    }
  }

  return {
    total: values.length,
    withData: validValues.length,
    withoutData: values.length - validValues.length,
    min: Math.min(...validValues),
    max: Math.max(...validValues),
    avg: validValues.reduce((a, b) => a + b, 0) / validValues.length,
  }
}

/**
 * Valida que normalized_value está entre 0 e 1
 * Retorna null se inválido e loga warning
 *
 * @param value - Valor normalizado para validar
 * @returns Valor validado ou null
 */
export function validateNormalizedValue(value: number | null): number | null {
  if (value === null) return null

  if (value < 0 || value > 1) {
    console.warn(`Invalid normalized_value: ${value}. Must be between 0-1.`)
    return null
  }

  return value
}
