import type { Feature, Geometry } from 'geojson'

/**
 * Identifica os diferentes grupos técnicos suportados pela aplicação.
 */
export enum GTType {
  AGUA = 'agua',
  LITORAL = 'litoral',
  SAUDE = 'saude',
  TRANSPORTES = 'transportes',
}

/**
 * Geometria GeoJSON utilizada pelos municípios dos GTs.
 */
export type GTGeometry = Geometry

/**
 * Propriedades auxiliares associadas a uma Feature GeoJSON genérica.
 */
export type GTFeatureProperties = Record<string, unknown>

/**
 * Feature GeoJSON genérica pronta para enriquecimento por GTs específicos.
 */
export type GTFeature = Feature<GTGeometry, GTFeatureProperties>

/**
 * Indicadores genéricos presentes em qualquer GT.
 * Esses campos podem ser estendidos por interfaces específicas.
 */
export interface IGTIndicadores {
  /**
   * Índice agregado padronizado (0-1) para comparação entre GTs.
   */
  indice_integrado?: number
  /**
   * Grau de confiabilidade dos dados (0-1) considerando cobertura e qualidade.
   */
  confiabilidade_dados?: number
}

/**
 * Estrutura base para municípios pertencentes a um GT.
 */
export interface IGTMunicipio<TIndicadores extends IGTIndicadores = IGTIndicadores> {
  /**
   * Identificador único (UUID) do município dentro do GT.
   */
  id: string
  /**
   * Nome oficial do município.
   */
  nome: string
  /**
   * Código IBGE com sete dígitos.
   */
  codigo_ibge: string
  /**
   * Grupo técnico ao qual o município pertence.
   */
  gt_type: GTType
  /**
   * Geometria GeoJSON utilizada nas visualizações.
   */
  geometria: GTGeometry
  /**
   * Indicadores calculados para o município.
   */
  indicadores: TIndicadores
  /**
   * Feature GeoJSON completa (quando disponível) para usos avançados.
   */
  feature?: GTFeature
  /**
   * Fontes de dados consultadas para composição dos indicadores.
   */
  fontes_dados?: string[]
}

/**
 * Estrutura auxiliar para filtros reutilizáveis em listagens e buscas.
 */
export interface GTFilter {
  gtType?: GTType
  searchTerm?: string
  municipioIds?: string[]
  indicadores?: Partial<Record<string, number>>
}

/**
 * Configuração de ordenação aplicada sobre coleções de municípios.
 */
export interface GTSort {
  field: 'nome' | 'codigo_ibge' | `indicadores.${string}`
  direction: 'asc' | 'desc'
}

/**
 * Atalho semântico para reutilização tipada de municípios.
 */
export type GTMunicipio<TIndicadores extends IGTIndicadores = IGTIndicadores> =
  IGTMunicipio<TIndicadores>
