import type { Feature, Geometry } from 'geojson'

import type {
  GTFeatureProperties,
  GTMunicipio,
  GTType,
  IGTIndicadores,
} from './gt-common.types'

/**
 * Indicadores específicos do GT Litoral.
 */
export interface GTLitoralIndicadores extends IGTIndicadores {
  /**
   * Elevação média costeira em metros acima do nível do mar.
   */
  elevacao_costeira_m: number
  /**
   * Probabilidade (0-1) de eventos de inundação costeira.
   */
  risco_inundacao: number
  /**
   * População residente em zonas de risco costeiro.
   */
  populacao_zona_risco: number
  /**
   * Índice de resiliência a eventos extremos (0-1).
   */
  indice_resiliencia_costeira?: number
}

/**
 * Propriedades adicionais utilizadas para features geoespaciais do GT Litoral.
 */
export interface GTLitoralFeatureProperties extends GTFeatureProperties {
  municipioId: string
  risco_inundacao: number
}

/**
 * Município pertencente ao GT Litoral com indicadores costeiros.
 */
export interface GTLitoralMunicipio
  extends GTMunicipio<GTLitoralIndicadores> {
  gt_type: GTType.LITORAL
  /**
   * Feature GeoJSON detalhando a faixa costeira do município.
   */
  faixa_costeira?: Feature<Geometry, GTLitoralFeatureProperties>
}
