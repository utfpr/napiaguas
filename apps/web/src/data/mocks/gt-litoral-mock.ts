import type { Feature, Polygon } from 'geojson'

import { GTType } from '@napi-aguas/shared'
import type {
  GTLitoralIndicadores,
  GTLitoralIndicadoresComplementares,
  GTLitoralMunicipioDetalhado,
  GTLitoralPeriodo,
} from '@/types/gt-litoral.types'

type Coordinate = [number, number]

const GTLITORAL_PERIODOS = ['2022', '2023', '2024'] as const satisfies readonly GTLitoralPeriodo[]
export const GTLITORAL_DEFAULT_PERIODO: GTLitoralPeriodo = '2024'
export const GTLITORAL_PERIODOS_DISPONIVEIS = [...GTLITORAL_PERIODOS]

export interface GTLitoralMunicipioMock extends GTLitoralMunicipioDetalhado {
  historico: Record<GTLitoralPeriodo, GTLitoralIndicadores>
}

const ensureClosed = (coordinates: Coordinate[]): Coordinate[] => {
  if (coordinates.length === 0) {
    return []
  }

  const [firstLng, firstLat] = coordinates[0]
  const [lastLng, lastLat] = coordinates[coordinates.length - 1]

  if (firstLng === lastLng && firstLat === lastLat) {
    return coordinates
  }

  return [...coordinates, coordinates[0]]
}

const createPolygon = (coordinates: Coordinate[]): Polygon => ({
  type: 'Polygon',
  coordinates: [ensureClosed(coordinates)],
})

const deepClone = <T>(value: T): T =>
  JSON.parse(JSON.stringify(value)) as T

const createFaixaCosteiraFeature = (
  municipioId: string,
  coordinates: Coordinate[],
  riscoInundacao: number,
): Feature<Polygon, { municipioId: string; risco_inundacao: number }> => ({
  type: 'Feature',
  geometry: createPolygon(coordinates),
  properties: {
    municipioId,
    risco_inundacao: Number(riscoInundacao.toFixed(2)),
  },
})

const createIndicadores = (
  elevacao: number,
  risco: number,
  populacaoZonaRisco: number,
  indiceIntegrado: number,
  confiabilidade: number,
  indiceResiliencia?: number,
): GTLitoralIndicadores => ({
  elevacao_costeira_m: Number(elevacao.toFixed(2)),
  risco_inundacao: Number(risco.toFixed(2)),
  populacao_zona_risco: Math.round(populacaoZonaRisco),
  indice_integrado: Number(indiceIntegrado.toFixed(2)),
  confiabilidade_dados: Number(confiabilidade.toFixed(2)),
  indice_resiliencia_costeira:
    typeof indiceResiliencia === 'number'
      ? Number(indiceResiliencia.toFixed(2))
      : undefined,
})

interface MunicipioConfig {
  id: string
  nome: string
  codigoIbge: string
  historico: Record<GTLitoralPeriodo, GTLitoralIndicadores>
  indicadoresComplementares: GTLitoralIndicadoresComplementares
  geometria: Coordinate[]
  faixaCosteira: Coordinate[]
  fontesDados: string[]
}

const buildMunicipio = (config: MunicipioConfig): GTLitoralMunicipioMock => {
  const latestIndicadores = config.historico[GTLITORAL_DEFAULT_PERIODO]

  return {
    id: config.id,
    nome: config.nome,
    codigo_ibge: config.codigoIbge,
    gt_type: GTType.LITORAL,
    geometria: createPolygon(config.geometria),
    faixa_costeira: createFaixaCosteiraFeature(
      config.id,
      config.faixaCosteira,
      latestIndicadores.risco_inundacao,
    ),
    indicadores: { ...latestIndicadores },
    historico: { ...config.historico },
    fontes_dados: [...config.fontesDados],
    indicadoresComplementares: { ...config.indicadoresComplementares },
  }
}

const MUNICIPIOS_CONFIG: MunicipioConfig[] = [
  {
    id: 'a1fc5c1c-8120-4c4d-8a34-8a57c3fbf438',
    nome: 'Antonina',
    codigoIbge: '4102501',
    historico: {
      '2022': createIndicadores(8.1, 0.46, 1820, 0.57, 0.71, 0.42),
      '2023': createIndicadores(8.3, 0.44, 1795, 0.59, 0.73, 0.45),
      '2024': createIndicadores(8.4, 0.42, 1765, 0.61, 0.76, 0.47),
    },
    indicadoresComplementares: {
      indiceVulnerabilidadeCosteira: 0.63,
      densidadePopulacionalKm2: 58,
      nivelSocioeconomico: 'medio',
      exposicaoOndas: 0.58,
      erosaoCosteira: 0.33,
      deslizamentos: 0.27,
      inundacao: 0.45,
    },
    geometria: [
      [-48.753, -25.455],
      [-48.701, -25.455],
      [-48.701, -25.403],
      [-48.753, -25.403],
    ],
    faixaCosteira: [
      [-48.751, -25.448],
      [-48.709, -25.448],
      [-48.709, -25.412],
      [-48.751, -25.412],
    ],
    fontesDados: [
      'Plano Estadual de Gerenciamento Costeiro (2024)',
      'IBGE Cidades - Perfil dos Municípios (2023)',
      'CEMADEN - Anuário de Eventos Críticos (2024)',
    ],
  },
  {
    id: 'fbe7a3d6-65eb-4b1d-aafb-dcab3754c639',
    nome: 'Guaraqueçaba',
    codigoIbge: '4109700',
    historico: {
      '2022': createIndicadores(6.2, 0.71, 2140, 0.54, 0.68, 0.38),
      '2023': createIndicadores(6.3, 0.73, 2105, 0.56, 0.7, 0.41),
      '2024': createIndicadores(6.5, 0.75, 2070, 0.58, 0.72, 0.43),
    },
    indicadoresComplementares: {
      indiceVulnerabilidadeCosteira: 0.78,
      densidadePopulacionalKm2: 12,
      nivelSocioeconomico: 'baixo',
      exposicaoOndas: 0.82,
      erosaoCosteira: 0.57,
      deslizamentos: 0.31,
      inundacao: 0.62,
    },
    geometria: [
      [-48.673, -25.285],
      [-48.591, -25.285],
      [-48.591, -25.203],
      [-48.673, -25.203],
    ],
    faixaCosteira: [
      [-48.67, -25.276],
      [-48.599, -25.276],
      [-48.599, -25.212],
      [-48.67, -25.212],
    ],
    fontesDados: [
      'Observatório Costeiro do Paraná (2024)',
      'IBGE - Estimativas Populacionais (2023)',
      'SIMEPAR - Monitoramento Costeiro (2024)',
    ],
  },
  {
    id: '27dc8a8f-2ead-4a43-a697-f54bbda05d73',
    nome: 'Guaratuba',
    codigoIbge: '4109609',
    historico: {
      '2022': createIndicadores(9.1, 0.58, 3980, 0.61, 0.77, 0.53),
      '2023': createIndicadores(9.3, 0.56, 3925, 0.63, 0.79, 0.56),
      '2024': createIndicadores(9.4, 0.55, 3860, 0.65, 0.81, 0.58),
    },
    indicadoresComplementares: {
      indiceVulnerabilidadeCosteira: 0.69,
      densidadePopulacionalKm2: 132,
      nivelSocioeconomico: 'medio',
      exposicaoOndas: 0.71,
      erosaoCosteira: 0.48,
      deslizamentos: 0.29,
      inundacao: 0.52,
    },
    geometria: [
      [-48.644, -25.905],
      [-48.558, -25.905],
      [-48.558, -25.819],
      [-48.644, -25.819],
    ],
    faixaCosteira: [
      [-48.64, -25.892],
      [-48.567, -25.892],
      [-48.567, -25.832],
      [-48.64, -25.832],
    ],
    fontesDados: [
      'Prefeitura de Guaratuba - Plano Diretor Costeiro (2024)',
      'DER/PR - Monitoramento da Orla (2023)',
      'CEMADEN - Relatório Hidrometeorológico (2024)',
    ],
  },
  {
    id: 'ea2c4fd0-f7ff-4304-888e-6fa1993857e9',
    nome: 'Matinhos',
    codigoIbge: '4115705',
    historico: {
      '2022': createIndicadores(7.9, 0.76, 4260, 0.64, 0.8, 0.49),
      '2023': createIndicadores(8.1, 0.77, 4190, 0.66, 0.82, 0.52),
      '2024': createIndicadores(8.2, 0.78, 4125, 0.68, 0.84, 0.55),
    },
    indicadoresComplementares: {
      indiceVulnerabilidadeCosteira: 0.82,
      densidadePopulacionalKm2: 356,
      nivelSocioeconomico: 'medio',
      exposicaoOndas: 0.88,
      erosaoCosteira: 0.64,
      deslizamentos: 0.35,
      inundacao: 0.73,
    },
    geometria: [
      [-48.58, -25.865],
      [-48.515, -25.865],
      [-48.515, -25.8],
      [-48.58, -25.8],
    ],
    faixaCosteira: [
      [-48.573, -25.856],
      [-48.523, -25.856],
      [-48.523, -25.808],
      [-48.573, -25.808],
    ],
    fontesDados: [
      'Projeto Orla Paraná - Relatório Matinhos (2024)',
      'IPARDES - Perfil Municipal (2023)',
      'CEMADEN - Relatório de Inundações (2024)',
    ],
  },
  {
    id: '64a5a364-67a1-4a63-9a0d-8e282ba5daf3',
    nome: 'Morretes',
    codigoIbge: '4116204',
    historico: {
      '2022': createIndicadores(10.2, 0.47, 2380, 0.6, 0.75, 0.5),
      '2023': createIndicadores(10.4, 0.45, 2325, 0.62, 0.77, 0.53),
      '2024': createIndicadores(10.5, 0.44, 2280, 0.64, 0.79, 0.55),
    },
    indicadoresComplementares: {
      indiceVulnerabilidadeCosteira: 0.61,
      densidadePopulacionalKm2: 32,
      nivelSocioeconomico: 'medio',
      exposicaoOndas: 0.49,
      erosaoCosteira: 0.37,
      deslizamentos: 0.4,
      inundacao: 0.46,
    },
    geometria: [
      [-48.864, -25.537],
      [-48.79, -25.537],
      [-48.79, -25.463],
      [-48.864, -25.463],
    ],
    faixaCosteira: [
      [-48.853, -25.528],
      [-48.801, -25.528],
      [-48.801, -25.472],
      [-48.853, -25.472],
    ],
    fontesDados: [
      'Instituto Água e Terra - Monitoramento Serra do Mar (2024)',
      'IBGE - Censo 2022',
      'UFPR Litoral - Estudos de Vulnerabilidade (2023)',
    ],
  },
  {
    id: '0d6b14d2-f1c2-4418-aa69-07ef0ac5ff73',
    nome: 'Paranaguá',
    codigoIbge: '4118204',
    historico: {
      '2022': createIndicadores(5.8, 0.69, 6120, 0.66, 0.83, 0.41),
      '2023': createIndicadores(6.0, 0.68, 6050, 0.67, 0.84, 0.44),
      '2024': createIndicadores(6.1, 0.67, 5980, 0.69, 0.86, 0.46),
    },
    indicadoresComplementares: {
      indiceVulnerabilidadeCosteira: 0.76,
      densidadePopulacionalKm2: 412,
      nivelSocioeconomico: 'medio',
      exposicaoOndas: 0.74,
      erosaoCosteira: 0.59,
      deslizamentos: 0.33,
      inundacao: 0.68,
    },
    geometria: [
      [-48.552, -25.553],
      [-48.466, -25.553],
      [-48.466, -25.467],
      [-48.552, -25.467],
    ],
    faixaCosteira: [
      [-48.545, -25.542],
      [-48.475, -25.542],
      [-48.475, -25.478],
      [-48.545, -25.478],
    ],
    fontesDados: [
      'APPA - Relatório Ambiental Porto de Paranaguá (2024)',
      'IBGE - Arranjos Populacionais (2023)',
      'CEMADEN - Monitoramento Inundações Urbanas (2024)',
    ],
  },
  {
    id: 'a3d5e387-0a22-42f8-901c-0f08d29477d6',
    nome: 'Pontal do Paraná',
    codigoIbge: '4119959',
    historico: {
      '2022': createIndicadores(7.1, 0.72, 3210, 0.62, 0.79, 0.48),
      '2023': createIndicadores(7.3, 0.73, 3165, 0.64, 0.81, 0.51),
      '2024': createIndicadores(7.5, 0.74, 3110, 0.66, 0.83, 0.54),
    },
    indicadoresComplementares: {
      indiceVulnerabilidadeCosteira: 0.81,
      densidadePopulacionalKm2: 188,
      nivelSocioeconomico: 'medio',
      exposicaoOndas: 0.86,
      erosaoCosteira: 0.62,
      deslizamentos: 0.28,
      inundacao: 0.71,
    },
    geometria: [
      [-48.52, -25.7],
      [-48.446, -25.7],
      [-48.446, -25.626],
      [-48.52, -25.626],
    ],
    faixaCosteira: [
      [-48.514, -25.688],
      [-48.455, -25.688],
      [-48.455, -25.638],
      [-48.514, -25.638],
    ],
    fontesDados: [
      'Projeto Litoral Sustentável (2024)',
      'IBGE - Indicadores Socioeconômicos (2023)',
      'CEMADEN - Monitoramento Costeiro (2024)',
    ],
  },
]

export const gtLitoralMockData: GTLitoralMunicipioMock[] = MUNICIPIOS_CONFIG.map((config) =>
  buildMunicipio(config),
)

export function cloneMunicipioMock(
  municipio: GTLitoralMunicipioMock,
): GTLitoralMunicipioMock {
  return {
    ...municipio,
    indicadores: { ...municipio.indicadores },
    historico: Object.fromEntries(
      Object.entries(municipio.historico).map(([periodo, indicadores]) => [
        periodo,
        { ...indicadores },
      ]),
    ) as Record<GTLitoralPeriodo, GTLitoralIndicadores>,
    fontes_dados: [...(municipio.fontes_dados ?? [])],
    indicadoresComplementares: { ...municipio.indicadoresComplementares },
    faixa_costeira: municipio.faixa_costeira
      ? {
          type: 'Feature',
          geometry: deepClone(municipio.faixa_costeira.geometry),
          properties: { ...municipio.faixa_costeira.properties },
        }
      : undefined,
    geometria: deepClone(municipio.geometria),
  }
}
