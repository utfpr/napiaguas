// Schema de validação de GPKGs do GT Litoral: 7 municípios costeiros do Paraná,
// MultiPolygon em SIRGAS 2000 (4674) ou WGS84 (4326), 7 indicadores-folha + IVC.
import type { GpkgWorkgroupSchema } from './types'

export const LITORAL_INDICADORES = [
  'Dens_pop',
  'Socioeconomico',
  'Uso_solo',
  'Ondas',
  'Erosao_costeira',
  'Deslizamentos',
  'Inundacoes',
] as const

export const LITORAL_IDENTIFICADORES = ['CD_MUN', 'NM_MUN'] as const

// IVC é importado em coastal_indicator_values mas não é selecionável na UI
// (apenas os 7 indicadores-folha são clicáveis).
export const LITORAL_INDICE = ['IVC'] as const

export const LITORAL_REQUIRED_FIELDS = [
  ...LITORAL_IDENTIFICADORES,
  ...LITORAL_INDICADORES,
  ...LITORAL_INDICE,
] as const

export const LITORAL_NUMERIC_FIELDS = [
  ...LITORAL_INDICADORES,
  ...LITORAL_INDICE,
] as const

// Tolerância zero no feature count: os 7 municípios litorâneos do Paraná são fixos.
export const LITORAL_SCHEMA: GpkgWorkgroupSchema = {
  workgroupId: 'litoral',
  layerName: 'sf_INDICE_Litoral',
  geometryType: 'MultiPolygon',
  acceptedCRS: [
    4674, // SIRGAS 2000 (oficial do Brasil)
    4326, // WGS84 (padrão web/GPS)
  ],
  expectedFeatureCount: {
    target: 7, // Municípios litorâneos do Paraná
    min: 7, // Sem tolerância - número fixo
    max: 7, // Sem tolerância - número fixo
  },
  identifierFields: ['CD_MUN', 'NM_MUN'],
  requiredFields: [...LITORAL_REQUIRED_FIELDS],
  numericFields: [...LITORAL_NUMERIC_FIELDS],
}
