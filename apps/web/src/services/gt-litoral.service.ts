import {
  GTLITORAL_DEFAULT_PERIODO,
  GTLITORAL_PERIODOS_DISPONIVEIS,
  cloneMunicipioMock,
  gtLitoralMockData,
  type GTLitoralMunicipioMock,
} from '@/data/mocks/gt-litoral-mock'
import type {
  GTLitoralFilters,
  GTLitoralIndicadoresConsolidados,
  GTLitoralMunicipioDetalhado,
  GTLitoralPeriodo,
  GTLitoralRequestOptions,
} from '@/types/gt-litoral.types'

const SIMULATED_DELAY_MS = 280

const normalizeText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

const averageOrNull = (sum: number, count: number): number | null => {
  if (count === 0) {
    return null
  }

  return Number((sum / count).toFixed(2))
}

export class GTLitoralError extends Error {
  constructor(message: string, readonly code: string) {
    super(message)
    this.name = 'GTLitoralError'
  }
}

export class GTLitoralValidationError extends GTLitoralError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR')
  }
}

export class GTLitoralNotFoundError extends GTLitoralError {
  constructor(message: string) {
    super(message, 'NOT_FOUND')
  }
}

export class GTLitoralTimeoutError extends GTLitoralError {
  constructor(message: string) {
    super(message, 'TIMEOUT')
  }
}

type NormalizedFilters = {
  nome?: string
  codigo_ibge?: string
  municipioId?: string
  periodo?: GTLitoralPeriodo
}

export class GTLitoralServiceImpl {
  private readonly periodos = new Set<GTLitoralPeriodo>(GTLITORAL_PERIODOS_DISPONIVEIS)

  constructor(private readonly dataset: GTLitoralMunicipioMock[]) {}

  async getMunicipios(
    filters?: GTLitoralFilters,
    options?: GTLitoralRequestOptions,
  ): Promise<GTLitoralMunicipioDetalhado[]> {
    const normalizedFilters = this.validateFilters(filters)

    await this.simulateLatency(options, 'Tempo limite excedido ao carregar municípios do GT Litoral')

    let collection = this.dataset

    if (normalizedFilters.municipioId) {
      collection = collection.filter((municipio) => municipio.id === normalizedFilters.municipioId)
    }

    if (normalizedFilters.codigo_ibge) {
      collection = collection.filter(
        (municipio) => municipio.codigo_ibge === normalizedFilters.codigo_ibge,
      )
    }

    if (normalizedFilters.nome) {
      const expected = normalizeText(normalizedFilters.nome)
      collection = collection.filter((municipio) =>
        normalizeText(municipio.nome).includes(expected),
      )
    }

    return collection.map((municipio) =>
      this.createMunicipioPayload(municipio, normalizedFilters.periodo),
    )
  }

  async getMunicipioById(
    id: string,
    options?: GTLitoralRequestOptions,
  ): Promise<GTLitoralMunicipioDetalhado> {
    const trimmedId = id?.trim()
    if (!trimmedId) {
      throw new GTLitoralValidationError('Parâmetro "id" é obrigatório')
    }

    await this.simulateLatency(options, 'Tempo limite excedido ao carregar município do GT Litoral')

    const municipio = this.dataset.find((entry) => entry.id === trimmedId)

    if (!municipio) {
      throw new GTLitoralNotFoundError(`Município com id "${trimmedId}" não encontrado`)
    }

    return this.createMunicipioPayload(municipio)
  }

  async getIndicadoresConsolidados(
    filters?: { periodo?: string },
    options?: GTLitoralRequestOptions,
  ): Promise<GTLitoralIndicadoresConsolidados> {
    const periodo = this.resolvePeriodo(filters?.periodo)

    await this.simulateLatency(
      options,
      'Tempo limite excedido ao consolidar indicadores do GT Litoral',
    )

    const municipios = this.dataset.map((municipio) =>
      this.createMunicipioPayload(municipio, periodo),
    )

    if (municipios.length === 0) {
      throw new GTLitoralError('Nenhum município cadastrado para cálculo dos indicadores', 'EMPTY')
    }

    const fontesSet = new Set<string>()
    const distribution = {
      alto: 0,
      medio: 0,
      baixo: 0,
    }

    const aggregates = municipios.reduce(
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
          acc.faixaCosteira += 1
        }

        if (indicadores.risco_inundacao >= 0.7) {
          distribution.alto += 1
        } else if (indicadores.risco_inundacao >= 0.4) {
          distribution.medio += 1
        } else {
          distribution.baixo += 1
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
        faixaCosteira: 0,
        indiceIntegrado: { sum: 0, count: 0 },
        confiabilidade: { sum: 0, count: 0 },
        resiliencia: { sum: 0, count: 0 },
      },
    )

    const totalMunicipios = municipios.length

    return {
      periodo,
      totalMunicipios,
      municipiosComFaixaCosteira: aggregates.faixaCosteira,
      mediaElevacaoCosteira: Number((aggregates.elevacao / totalMunicipios).toFixed(2)),
      mediaRiscoInundacao: Number((aggregates.risco / totalMunicipios).toFixed(2)),
      indiceIntegradoMedio: averageOrNull(
        aggregates.indiceIntegrado.sum,
        aggregates.indiceIntegrado.count,
      ),
      indiceResilienciaCosteiraMedia: averageOrNull(
        aggregates.resiliencia.sum,
        aggregates.resiliencia.count,
      ),
      confiabilidadeDadosMedia: averageOrNull(
        aggregates.confiabilidade.sum,
        aggregates.confiabilidade.count,
      ),
      populacaoZonaRiscoTotal: aggregates.populacao,
      distribuicaoRiscoInundacao: distribution,
      fontesDados: Array.from(fontesSet),
    }
  }

  getPeriodosDisponiveis(): GTLitoralPeriodo[] {
    return Array.from(this.periodos)
  }

  private createMunicipioPayload(
    municipio: GTLitoralMunicipioMock,
    periodo?: GTLitoralPeriodo,
  ): GTLitoralMunicipioDetalhado {
    const clone = cloneMunicipioMock(municipio)
    const indicadores =
      periodo && clone.historico[periodo] ? clone.historico[periodo] : clone.indicadores

    const { historico, ...rest } = clone

    return {
      ...rest,
      indicadores: { ...indicadores },
    }
  }

  private validateFilters(filters?: GTLitoralFilters): NormalizedFilters {
    if (!filters) {
      return {}
    }

    const allowedKeys = new Set(['nome', 'codigo_ibge', 'municipioId', 'periodo'])
    const invalidKeys = Object.keys(filters).filter((key) => !allowedKeys.has(key))

    if (invalidKeys.length > 0) {
      throw new GTLitoralValidationError(
        `Filtros inválidos: ${invalidKeys.map((key) => `"${key}"`).join(', ')}`,
      )
    }

    const normalized: NormalizedFilters = {}

    if (filters.nome !== undefined) {
      const nome = filters.nome.trim()
      if (!nome) {
        throw new GTLitoralValidationError('Filtro "nome" não pode ser vazio')
      }
      normalized.nome = nome
    }

    if (filters.codigo_ibge !== undefined) {
      const codigo = filters.codigo_ibge.trim()
      if (!/^\d{6,7}$/.test(codigo)) {
        throw new GTLitoralValidationError(
          'Filtro "codigo_ibge" deve conter 6 ou 7 dígitos numéricos',
        )
      }
      normalized.codigo_ibge = codigo
    }

    if (filters.municipioId !== undefined) {
      const municipioId = filters.municipioId.trim()
      if (!municipioId) {
        throw new GTLitoralValidationError('Filtro "municipioId" não pode ser vazio')
      }
      normalized.municipioId = municipioId
    }

    if (filters.periodo !== undefined) {
      normalized.periodo = this.normalizePeriodo(filters.periodo)
    }

    return normalized
  }

  private normalizePeriodo(periodo: string): GTLitoralPeriodo {
    const trimmed = periodo.trim()
    if (!trimmed) {
      throw new GTLitoralValidationError('Filtro "periodo" não pode ser vazio')
    }

    const normalized = trimmed as GTLitoralPeriodo
    if (!this.periodos.has(normalized)) {
      throw new GTLitoralValidationError(
        `Período "${periodo}" não é suportado. Valores válidos: ${GTLITORAL_PERIODOS_DISPONIVEIS.join(
          ', ',
        )}`,
      )
    }

    return normalized
  }

  private resolvePeriodo(periodo?: string): GTLitoralPeriodo {
    if (periodo === undefined) {
      return GTLITORAL_DEFAULT_PERIODO
    }

    return this.normalizePeriodo(periodo)
  }

  private async simulateLatency(
    options: GTLitoralRequestOptions | undefined,
    timeoutMessage: string,
  ): Promise<void> {
    if (options?.simulateTimeout) {
      throw new GTLitoralTimeoutError(timeoutMessage)
    }

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => resolve(), SIMULATED_DELAY_MS)

      if (options?.signal) {
        options.signal.addEventListener(
          'abort',
          () => {
            clearTimeout(timer)
            reject(new GTLitoralTimeoutError(timeoutMessage))
          },
          { once: true },
        )
      }
    })
  }
}

export const gtLitoralService = new GTLitoralServiceImpl(gtLitoralMockData)
export type GTLitoralService = GTLitoralServiceImpl
