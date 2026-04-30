import type { FeatureCollection } from '@napi-aguas/shared'

import env from '@/config/env'

export interface GeometriesRequestOptions {
  simplified?: boolean
  signal?: AbortSignal
}

type QueryValue = string | number | boolean | null | undefined

const ABSOLUTE_URL_REGEX = /^https?:\/\//i
const geometryCache = new Map<string, FeatureCollection>()
const SESSION_STORAGE_KEY = 'napi-aguas-geometries-cache'

function appendQuery(url: string, query?: Record<string, QueryValue>): string {
  if (!query) {
    return url
  }

  const entries = Object.entries(query).filter(
    ([_key, value]) => value !== undefined && value !== null,
  )

  if (entries.length === 0) {
    return url
  }

  const search = entries
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&')

  const separator = url.includes('?') ? '&' : '?'

  return `${url}${separator}${search}`
}

function normalizePathSegments(segments: string[]): string {
  return segments
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => segment.replace(/^\/+/g, '').replace(/\/+$/g, ''))
    .join('/')
}

export function resolveApiUrl(
  baseUrl: string,
  pathSegments: string[],
  query?: Record<string, QueryValue>,
): string {
  const trimmedBase = (baseUrl ?? '').trim()
  const normalizedPath = normalizePathSegments(pathSegments)

  if (ABSOLUTE_URL_REGEX.test(trimmedBase)) {
    const baseWithTrailingSlash = trimmedBase.endsWith('/')
      ? trimmedBase
      : `${trimmedBase}/`

    const url = normalizedPath
      ? `${baseWithTrailingSlash}${normalizedPath}`
      : baseWithTrailingSlash.slice(0, -1)

    return appendQuery(url, query)
  }

  const baseWithoutTrailingSlash = trimmedBase.replace(/\/+$/g, '')

  let prefix = baseWithoutTrailingSlash
  if (prefix !== '') {
    prefix = prefix.startsWith('/') ? prefix : `/${prefix}`
  }

  const relativeUrl = normalizedPath
    ? `${prefix}/${normalizedPath}`
    : prefix || '/'

  const normalizedUrl = relativeUrl
    .replace(/\/+/g, '/')
    .replace(/^(?!\/)/, '/')
    .replace(/\/\//g, '/')

  return appendQuery(normalizedUrl, query)
}

async function parseResponse(response: Response): Promise<FeatureCollection> {
  const payload = (await response.json()) as FeatureCollection
  return payload
}

function getCacheStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null
  }
  try {
    return window.sessionStorage
  } catch (_error) {
    return null
  }
}

function buildGeometryCacheKey(workgroupId: string, simplified: boolean): string {
  return `${workgroupId}::${simplified ? 'simplified' : 'full'}`
}

function readGeometryFromStorage(cacheKey: string): FeatureCollection | null {
  const storage = getCacheStorage()
  if (!storage) {
    return null
  }

  try {
    const raw = storage.getItem(SESSION_STORAGE_KEY)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as Record<string, FeatureCollection>
    const entry = parsed[cacheKey]
    return entry ?? null
  } catch (_error) {
    return null
  }
}

function writeGeometryToStorage(cacheKey: string, data: FeatureCollection) {
  const storage = getCacheStorage()
  if (!storage) {
    return
  }

  try {
    const raw = storage.getItem(SESSION_STORAGE_KEY)
    const cache = raw ? (JSON.parse(raw) as Record<string, FeatureCollection>) : {}
    cache[cacheKey] = data
    storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(cache))
  } catch (_error) {
    // Ignora falhas de armazenamento silenciosamente
  }
}

async function getGeometriesByWorkgroup(
  workgroupId: string,
  options: GeometriesRequestOptions = {},
): Promise<FeatureCollection> {
  const simplified =
    typeof options.simplified === 'boolean' ? options.simplified : true
  const cacheKey = buildGeometryCacheKey(workgroupId, simplified)

  if (geometryCache.has(cacheKey)) {
    return geometryCache.get(cacheKey)!
  }

  const cached = readGeometryFromStorage(cacheKey)
  if (cached) {
    geometryCache.set(cacheKey, cached)
    return cached
  }

  const url = resolveApiUrl(env.apiBaseUrl, ['workgroups', workgroupId, 'geometries'], {
    simplified: String(simplified),
  })

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    signal: options.signal,
  })

  if (!response.ok) {
    throw new Error(`Erro ao carregar geometrias (${response.status})`)
  }

  const payload = await parseResponse(response)
  geometryCache.set(cacheKey, payload)
  writeGeometryToStorage(cacheKey, payload)
  return payload
}

export function clearGeometriesCache() {
  geometryCache.clear()
  const storage = getCacheStorage()
  storage?.removeItem(SESSION_STORAGE_KEY)
}

/**
 * Interface para município
 */
export interface Municipality {
  id: string
  name: string
}

/**
 * Interface para subbacia
 */
export interface Subbacia {
  id: string
  name: string
}

/**
 * Mock data para municípios do Paraná (parcial - principais cidades)
 */
const MOCK_MUNICIPALITIES: Municipality[] = [
  { id: 'mun-1', name: 'Curitiba' },
  { id: 'mun-2', name: 'Londrina' },
  { id: 'mun-3', name: 'Maringá' },
  { id: 'mun-4', name: 'Ponta Grossa' },
  { id: 'mun-5', name: 'Cascavel' },
  { id: 'mun-6', name: 'Foz do Iguaçu' },
  { id: 'mun-7', name: 'Paranaguá' },
  { id: 'mun-8', name: 'Antonina' },
  { id: 'mun-9', name: 'Guaratuba' },
  { id: 'mun-10', name: 'Matinhos' },
  { id: 'mun-11', name: 'Pontal do Paraná' },
  { id: 'mun-12', name: 'Morretes' },
  { id: 'mun-13', name: 'Guaraqueçaba' },
  { id: 'mun-14', name: 'Colombo' },
  { id: 'mun-15', name: 'Araucária' },
  { id: 'mun-16', name: 'São José dos Pinhais' },
  { id: 'mun-17', name: 'Pinhais' },
  { id: 'mun-18', name: 'Campo Largo' },
  { id: 'mun-19', name: 'Almirante Tamandaré' },
  { id: 'mun-20', name: 'Guarapuava' },
]

/**
 * Mock data para subbacias (Água Doce)
 */
const MOCK_SUBBACIAS: Subbacia[] = [
  { id: 'sub-1', name: 'Alto Iguaçu' },
  { id: 'sub-2', name: 'Médio Iguaçu' },
  { id: 'sub-3', name: 'Baixo Iguaçu' },
  { id: 'sub-4', name: 'Apucarana Leste' },
  { id: 'sub-5', name: 'Apucarana Sul' },
  { id: 'sub-6', name: 'Tibagi Alto' },
  { id: 'sub-7', name: 'Tibagi Médio' },
  { id: 'sub-8', name: 'Tibagi Baixo' },
  { id: 'sub-9', name: 'Paranapanema 1' },
  { id: 'sub-10', name: 'Paranapanema 2' },
  { id: 'sub-11', name: 'Paranapanema 3' },
  { id: 'sub-12', name: 'Ivaí' },
  { id: 'sub-13', name: 'Piquiri' },
  { id: 'sub-14', name: 'Pirapó' },
  { id: 'sub-15', name: 'Litorânea' },
]

/**
 * Busca municípios para os GTs Saúde e Litoral
 */
async function fetchMunicipalities(workgroup: 'saude' | 'litoral'): Promise<Municipality[]> {
  try {
    const url = resolveApiUrl(env.apiBaseUrl, ['geometries', workgroup, 'municipalities'])

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      // Backend não disponível, usa mock data
      console.warn(`Backend não disponível. Usando municípios mock para workgroup: ${workgroup}`)

      // Litoral tem apenas 7 municípios
      if (workgroup === 'litoral') {
        return MOCK_MUNICIPALITIES.filter(m =>
          ['Paranaguá', 'Antonina', 'Guaratuba', 'Matinhos', 'Pontal do Paraná', 'Morretes', 'Guaraqueçaba'].includes(m.name)
        )
      }

      // Saúde tem todos os municípios do Paraná (retornamos os principais)
      return MOCK_MUNICIPALITIES
    }

    const data = await response.json()
    return data as Municipality[]
  } catch (error) {
    console.warn(`Erro ao buscar municípios (${error}). Usando mock data para workgroup: ${workgroup}`)

    if (workgroup === 'litoral') {
      return MOCK_MUNICIPALITIES.filter(m =>
        ['Paranaguá', 'Antonina', 'Guaratuba', 'Matinhos', 'Pontal do Paraná', 'Morretes', 'Guaraqueçaba'].includes(m.name)
      )
    }

    return MOCK_MUNICIPALITIES
  }
}

/**
 * Busca subbacias para o GT Água Doce
 */
async function fetchSubbacias(): Promise<Subbacia[]> {
  try {
    const url = resolveApiUrl(env.apiBaseUrl, ['geometries', 'agua-doce', 'subbacias'])

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      console.warn('Backend não disponível. Usando subbacias mock')
      return MOCK_SUBBACIAS
    }

    const data = await response.json()
    return data as Subbacia[]
  } catch (error) {
    console.warn(`Erro ao buscar subbacias (${error}). Usando mock data`)
    return MOCK_SUBBACIAS
  }
}

export const geometriesService = {
  getGeometriesByWorkgroup,
  fetchMunicipalities,
  fetchSubbacias,
}
