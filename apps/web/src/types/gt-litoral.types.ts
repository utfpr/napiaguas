import type {
  GTLitoralIndicadores as SharedGTLitoralIndicadores,
  GTLitoralMunicipio as SharedGTLitoralMunicipio,
} from '@napi-aguas/shared'
import type { Feature, Geometry } from 'geojson'

export type GTLitoralIndicadores = SharedGTLitoralIndicadores
export type GTLitoralMunicipio = SharedGTLitoralMunicipio

export interface GTLitoralFilters {
  nome?: string
  codigo_ibge?: string
  municipioId?: string
  periodo?: string
}

export type GTLitoralPeriodo = '2022' | '2023' | '2024'

export interface GTLitoralRequestOptions {
  signal?: AbortSignal
  simulateTimeout?: boolean
}

export interface GTLitoralIndicadoresComplementares {
  indiceVulnerabilidadeCosteira: number
  densidadePopulacionalKm2: number
  nivelSocioeconomico: 'baixo' | 'medio' | 'alto'
  exposicaoOndas: number
  erosaoCosteira: number
  deslizamentos: number
  inundacao: number
}

export type GTLitoralMunicipioDetalhado = GTLitoralMunicipio & {
  indicadoresComplementares: GTLitoralIndicadoresComplementares
}

export interface GTLitoralIndicadoresConsolidados {
  periodo: string
  totalMunicipios: number
  municipiosComFaixaCosteira: number
  mediaElevacaoCosteira: number
  mediaRiscoInundacao: number
  indiceIntegradoMedio: number | null
  indiceResilienciaCosteiraMedia: number | null
  confiabilidadeDadosMedia: number | null
  populacaoZonaRiscoTotal: number
  distribuicaoRiscoInundacao: {
    alto: number
    medio: number
    baixo: number
  }
  fontesDados: string[]
}

export interface GTLitoralGeoFeature extends Feature<Geometry> {
  properties: Record<string, unknown>
}
