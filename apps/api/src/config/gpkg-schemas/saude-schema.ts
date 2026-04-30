import type { GpkgWorkgroupSchema } from './types'

export const SAUDE_INDICADORES_DOENCAS = [
  'PROP_ANP',
  'PROP_DE',
  'PROP_MDSC',
  'PROP_MDSR',
] as const

export const SAUDE_INDICADORES_POBREZA = [
  'IPDM_2022',
  'PDSI_2022',
  'TM5_2023',
  'PAN15_2022',
  'QPCUPB_2025',
  'QPCURB_2025',
  'QPCUMS_2025',
  'QFINCU_2025',
] as const

export const SAUDE_SUBINDICES = [
  'subIndice_doencas',
  'subIndice_pobreza',
  'subIndice_vulnerabilidade',
] as const

export const SAUDE_IDENTIFICADORES = ['Codigo', 'Municipio'] as const

export const SAUDE_INDICE = ['I_exposicao'] as const

export const SAUDE_REQUIRED_FIELDS = [
  ...SAUDE_IDENTIFICADORES,
  ...SAUDE_INDICADORES_DOENCAS,
  ...SAUDE_INDICADORES_POBREZA,
  ...SAUDE_SUBINDICES,
  ...SAUDE_INDICE,
] as const

export const SAUDE_NUMERIC_FIELDS = [
  ...SAUDE_INDICADORES_DOENCAS,
  ...SAUDE_INDICADORES_POBREZA,
  ...SAUDE_SUBINDICES,
  ...SAUDE_INDICE,
] as const

export const SAUDE_SCHEMA: GpkgWorkgroupSchema = {
  workgroupId: 'saude',
  layerName: 'sf_INDICE_Saude',
  geometryType: 'MultiPolygon',
  acceptedCRS: [4674, 4326],
  expectedFeatureCount: {
    target: 399,
    min: 389,
    max: 409,
  },
  identifierFields: ['Codigo', 'Municipio'],
  requiredFields: [...SAUDE_REQUIRED_FIELDS],
  numericFields: [...SAUDE_NUMERIC_FIELDS],
}
