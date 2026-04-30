import type {
  GTLitoralIndicadoresConsolidados,
  GTLitoralMunicipioDetalhado,
} from '@/types/gt-litoral.types'

import {
  GTLITORAL_PERIOD_FORMATTER,
  type GTLitoralIndicatorKey,
  type GTLitoralIndicatorOption,
} from './constants'

export const CONSOLIDADO_VALUE_MAP: Record<
  GTLitoralIndicatorKey,
  (data: GTLitoralIndicadoresConsolidados | null) => number | null
> = {
  risco_inundacao: (data) => data?.mediaRiscoInundacao ?? null,
  elevacao_costeira_m: (data) => data?.mediaElevacaoCosteira ?? null,
  populacao_zona_risco: (data) => data?.populacaoZonaRiscoTotal ?? null,
  indice_integrado: (data) => data?.indiceIntegradoMedio ?? null,
  confiabilidade_dados: (data) => data?.confiabilidadeDadosMedia ?? null,
  indice_resiliencia_costeira: (data) => data?.indiceResilienciaCosteiraMedia ?? null,
}

export const MUNICIPIO_INDICATOR_VALUE_MAP: Record<
  GTLitoralIndicatorKey,
  (municipio: GTLitoralMunicipioDetalhado | null) => number | null
> = {
  risco_inundacao: (municipio) => municipio?.indicadores.risco_inundacao ?? null,
  elevacao_costeira_m: (municipio) => municipio?.indicadores.elevacao_costeira_m ?? null,
  populacao_zona_risco: (municipio) => municipio?.indicadores.populacao_zona_risco ?? null,
  indice_integrado: (municipio) => municipio?.indicadores.indice_integrado ?? null,
  confiabilidade_dados: (municipio) => municipio?.indicadores.confiabilidade_dados ?? null,
  indice_resiliencia_costeira: (municipio) =>
    municipio?.indicadores.indice_resiliencia_costeira ?? null,
}

export const formatIndicatorValue = (
  option: GTLitoralIndicatorOption,
  value: number | null,
): string => {
  if (value === null || Number.isNaN(value)) {
    return '—'
  }

  return GTLITORAL_PERIOD_FORMATTER[option.format](value)
}

export const GT_LITORAL_COMPLEMENTARY_KEYS: Array<{
  key: keyof GTLitoralMunicipioDetalhado['indicadoresComplementares']
  label: string
}> = [
  { key: 'indiceVulnerabilidadeCosteira', label: 'Vulnerabilidade Costeira' },
  { key: 'densidadePopulacionalKm2', label: 'Densidade Populacional (hab/km²)' },
  { key: 'exposicaoOndas', label: 'Exposição a Ondas' },
  { key: 'erosaoCosteira', label: 'Erosão Costeira' },
  { key: 'deslizamentos', label: 'Deslizamentos' },
  { key: 'inundacao', label: 'Inundação' },
]

export const calculateConsolidadoFromMunicipios = (
  municipios: GTLitoralMunicipioDetalhado[],
  periodo?: string,
): GTLitoralIndicadoresConsolidados | null => {
  if (municipios.length === 0) {
    return null
  }

  const fontesSet = new Set<string>()
  const distribuicao = { alto: 0, medio: 0, baixo: 0 }

  const totals = municipios.reduce(
    (acc, municipio) => {
      const { indicadores, faixa_costeira, fontes_dados } = municipio

      acc.elevacao += indicadores.elevacao_costeira_m
      acc.risco += indicadores.risco_inundacao
      acc.populacao += indicadores.populacao_zona_risco

      if (typeof indicadores.indice_integrado === 'number') {
        acc.indiceIntegrado.sum += indicadores.indice_integrado
        acc.indiceIntegrado.count += 1
      }

      if (typeof indicadores.confiabilidade_dados === 'number') {
        acc.confiabilidade.sum += indicadores.confiabilidade_dados
        acc.confiabilidade.count += 1
      }

      if (typeof indicadores.indice_resiliencia_costeira === 'number') {
        acc.resiliencia.sum += indicadores.indice_resiliencia_costeira
        acc.resiliencia.count += 1
      }

      if (faixa_costeira) {
        acc.municipiosComFaixaCosteira += 1
      }

      if (indicadores.risco_inundacao >= 0.7) {
        distribuicao.alto += 1
      } else if (indicadores.risco_inundacao >= 0.4) {
        distribuicao.medio += 1
      } else {
        distribuicao.baixo += 1
      }

      fontes_dados?.forEach((fonte) => {
        fontesSet.add(fonte)
      })

      return acc
    },
    {
      elevacao: 0,
      risco: 0,
      populacao: 0,
      municipiosComFaixaCosteira: 0,
      indiceIntegrado: { sum: 0, count: 0 },
      confiabilidade: { sum: 0, count: 0 },
      resiliencia: { sum: 0, count: 0 },
    },
  )

  const totalMunicipios = municipios.length
  const average = (value: number) => Number((value / totalMunicipios).toFixed(2))
  const optionalAverage = (sum: number, count: number) =>
    count > 0 ? Number((sum / count).toFixed(2)) : null

  return {
    periodo: periodo ?? '',
    totalMunicipios,
    municipiosComFaixaCosteira: totals.municipiosComFaixaCosteira,
    mediaElevacaoCosteira: average(totals.elevacao),
    mediaRiscoInundacao: average(totals.risco),
    indiceIntegradoMedio: optionalAverage(totals.indiceIntegrado.sum, totals.indiceIntegrado.count),
    indiceResilienciaCosteiraMedia: optionalAverage(
      totals.resiliencia.sum,
      totals.resiliencia.count,
    ),
    confiabilidadeDadosMedia: optionalAverage(
      totals.confiabilidade.sum,
      totals.confiabilidade.count,
    ),
    populacaoZonaRiscoTotal: totals.populacao,
    distribuicaoRiscoInundacao: distribuicao,
    fontesDados: Array.from(fontesSet),
  }
}
