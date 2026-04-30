import type { GpkgWorkgroupSchema } from './types'

export const AGUA_DOCE_NUMERIC_FIELDS = [
  'IVCaq',
  'Exposicao',
  'Sensibilidade',
  'Capacidade_Adaptativa',
  'Agricultura',
  'Mineracao',
  'Area_urbana',
  'Pastagens',
  'Silvicultura',
  'Precipitacao_var',
  'Tmax_var',
  'IFP_norm',
  'disF_peixes',
  'disF_bentos',
  'Prop_MacNN',
  'Prop_MacEPT',
  'Prop_peixesNN',
  'Prop_peixesEnd',
  'Prop_peixesAm',
  'Prop_peixesMigr',
  'redF_bentos',
  'redF_peixes',
  'Prop_Bent_N',
  'ICL',
  'UC_perc',
  'Prop_Peix_N',
] as const

export const AGUA_DOCE_REQUIRED_FIELDS = ['HYBAS_ID', ...AGUA_DOCE_NUMERIC_FIELDS] as const

export const AGUA_DOCE_OPTIONAL_FIELDS = ['NOME_COMIT'] as const

export const AGUA_DOCE_SCHEMA: GpkgWorkgroupSchema = {
  workgroupId: 'agua-doce',
  layerName: 'sf_INDICE_ecossistemas',
  geometryType: 'MultiPolygon',
  acceptedCRS: [4326],
  expectedFeatureCount: {
    target: 0,
    min: 0,
    max: 10000,
  },
  identifierFields: ['HYBAS_ID'],
  requiredFields: [...AGUA_DOCE_REQUIRED_FIELDS],
  optionalFields: [...AGUA_DOCE_OPTIONAL_FIELDS],
  numericFields: [...AGUA_DOCE_NUMERIC_FIELDS],
}
