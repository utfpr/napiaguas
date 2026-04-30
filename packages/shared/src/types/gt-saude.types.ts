import type { GTMunicipio, GTType, IGTIndicadores } from './gt-common.types'

/**
 * Indicadores específicos do GT Saúde.
 */
export interface GTSaudeIndicadores extends IGTIndicadores {
  /**
   * Percentual de cobertura da atenção básica (0-100).
   */
  cobertura_atencao_basica_percentual: number
  /**
   * Índice composto de vulnerabilidade em saúde (0-1).
   */
  indice_vulnerabilidade_saude: number
  /**
   * Taxa de internações por causas sensíveis à atenção básica (por 100 mil hab.).
   */
  internacoes_sensiveis_por_100k: number
  /**
   * Percentual de cobertura vacinal infantil (0-100).
   */
  cobertura_vacinacao_infantil_percentual?: number
}

/**
 * Município pertencente ao GT Saúde.
 */
export interface GTSaudeMunicipio
  extends GTMunicipio<GTSaudeIndicadores> {
  gt_type: GTType.SAUDE
  /**
   * Regional de saúde à qual o município está vinculado.
   */
  regional_saude: string
  /**
   * População estimada utilizada nas métricas epidemiológicas.
   */
  populacao_total?: number
  /**
   * Referências principais da rede assistencial do município.
   */
  rede_referencia?: string[]
}
