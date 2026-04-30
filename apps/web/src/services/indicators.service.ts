import env from '@/config/env'
import type { IndicatorNode } from '@/types/indicators'
import { cloneIndicatorTree } from '@/types/indicators'
import { resolveApiUrl } from './geometries.service'

interface RequestOptions {
  signal?: AbortSignal
}

type LegacyIndicatorType = 'index' | 'subindex' | 'indicator'
type AguaDoceIndicatorType = 'indice' | 'subindice' | 'indicador'

interface AguaDoceHierarchyApiNode {
  id: string
  code: string
  name: string
  type: AguaDoceIndicatorType
  parent_id: string | null
  order: number
  unit?: string | null
  description?: string | null
  children: AguaDoceHierarchyApiNode[]
}

interface LegacyHierarchyApiNode {
  id: string
  uuid?: string
  code?: string // Opcional - transportes não tem code
  name: string
  type?: LegacyIndicatorType // Opcional - transportes usa 'level' em vez de 'type'
  level?: LegacyIndicatorType // Transportes usa 'level' em vez de 'type'
  order?: number
  unit?: string | null
  description?: string | null
  children?: LegacyHierarchyApiNode[]
}

export interface IndicatorValueDto {
  hybas_id?: string
  codigo_municipio?: string
  municipio?: string
  value: number | null
  normalized_value: number | null
}

const indicatorTreeCache = new Map<string, IndicatorNode[]>()

async function fetchJson<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    signal: options.signal,
  })

  if (!response.ok) {
    const error = new Error(
      `Erro ao carregar dados (${response.status} ${response.statusText})`,
    )
    ;(error as any).status = response.status
    throw error
  }

  return (await response.json()) as T
}

function mapAguaDoceNode(node: AguaDoceHierarchyApiNode): IndicatorNode {
  return {
    id: node.code,
    uuid: node.id,
    code: node.code,
    name: node.name,
    description: node.description ?? undefined,
    type: mapAguaDoceType(node.type),
    rawType: node.type,
    order: node.order,
    unit: node.unit ?? undefined,
    children: node.children.map(mapAguaDoceNode),
  }
}

function mapLegacyNode(node: LegacyHierarchyApiNode): IndicatorNode {
  // Transportes usa 'level' em vez de 'type' e 'name' em vez de 'code'
  const nodeType = (node.type ?? node.level ?? 'indicator') as LegacyIndicatorType
  const nodeCode = node.code ?? node.name

  return {
    id: nodeCode,
    uuid: node.uuid ?? node.id,
    code: nodeCode,
    name: node.name,
    description: node.description ?? undefined,
    type: nodeType,
    rawType: mapLegacyTypeToRaw(nodeType),
    order: node.order ?? 0,
    unit: node.unit ?? undefined,
    children: (node.children ?? []).map(mapLegacyNode),
  }
}

function mapAguaDoceType(type: AguaDoceIndicatorType): LegacyIndicatorType {
  switch (type) {
    case 'indice':
      return 'index'
    case 'subindice':
      return 'subindex'
    default:
      return 'indicator'
  }
}

function mapLegacyTypeToRaw(type: LegacyIndicatorType): AguaDoceIndicatorType {
  switch (type) {
    case 'index':
      return 'indice'
    case 'subindex':
      return 'subindice'
    default:
      return 'indicador'
  }
}

function sortIndicatorNodes(nodes: IndicatorNode[]) {
  nodes.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  nodes.forEach((child) => sortIndicatorNodes(child.children))
}

export async function getIndicatorHierarchy(
  workgroupId: string,
  options: RequestOptions = {},
): Promise<IndicatorNode[]> {
  if (indicatorTreeCache.has(workgroupId)) {
    return cloneIndicatorTree(indicatorTreeCache.get(workgroupId) ?? [])
  }

  // Workgroups que usam indicator_hierarchy (formato novo com tipos pt-br)
  const usesIndicatorHierarchy = workgroupId === 'agua-doce' || workgroupId === 'saude' || workgroupId === 'litoral'

  const pathSegments =
    usesIndicatorHierarchy
      ? ['workgroups', workgroupId, 'indicators', 'hierarchy']
      : ['workgroups', workgroupId, 'indicators']

  const url = resolveApiUrl(env.apiBaseUrl, pathSegments)

  if (usesIndicatorHierarchy) {
    const payload = await fetchJson<AguaDoceHierarchyApiNode[]>(url, options)
    const mapped = payload.map(mapAguaDoceNode)
    sortIndicatorNodes(mapped)
    indicatorTreeCache.set(workgroupId, mapped)
    return cloneIndicatorTree(mapped)
  }

  const payload = await fetchJson<LegacyHierarchyApiNode[]>(url, options)
  const mapped = payload.map(mapLegacyNode)
  sortIndicatorNodes(mapped)
  indicatorTreeCache.set(workgroupId, mapped)
  return cloneIndicatorTree(mapped)
}

export async function getIndicatorsByWorkgroup(
  workgroupId: string,
  options: RequestOptions = {},
): Promise<IndicatorNode[]> {
  return getIndicatorHierarchy(workgroupId, options)
}

export async function getIndicatorValues(
  workgroupId: string,
  indicatorId: string,
  options: RequestOptions = {},
): Promise<IndicatorValueDto[]> {
  const url = resolveApiUrl(env.apiBaseUrl, [
    'workgroups',
    workgroupId,
    'indicators',
    indicatorId,
    'values',
  ])

  const values = await fetchJson<Array<IndicatorValueDto | Record<string, unknown>>>(
    url,
    options,
  )

  return values.map((entry) => ({
    // Suportar tanto hybas_id (água-doce) quanto codigo_municipio (saúde)
    hybas_id:
      entry.hybas_id !== undefined && entry.hybas_id !== null
        ? String(entry.hybas_id)
        : undefined,
    codigo_municipio:
      entry.codigo_municipio !== undefined && entry.codigo_municipio !== null
        ? String(entry.codigo_municipio)
        : undefined,
    municipio:
      entry.municipio !== undefined && entry.municipio !== null
        ? String(entry.municipio)
        : undefined,
    value:
      entry.value === null || entry.value === undefined
        ? null
        : Number.isFinite(Number(entry.value))
          ? Number(entry.value)
          : null,
    normalized_value:
      entry.normalized_value === null || entry.normalized_value === undefined
        ? null
        : Number.isFinite(Number(entry.normalized_value))
          ? Number(entry.normalized_value)
          : null,
  }))
}

/**
 * Busca dados otimizados (geometrias + valores) para o GT Litoral.
 * Este endpoint retorna FeatureCollection completo em uma única chamada.
 *
 * @param workgroupId - ID do workgroup (deve ser 'litoral')
 * @param indicatorId - UUID ou código do indicador
 * @param options - Opções de requisição (signal para abort)
 * @returns FeatureCollection com geometrias e valores do indicador
 */
export async function getIndicatorDataOptimized(
  workgroupId: string,
  indicatorId: string,
  options: RequestOptions = {},
): Promise<any> {
  const url = resolveApiUrl(env.apiBaseUrl, [
    'workgroups',
    workgroupId,
    'indicators',
    indicatorId,
    'data',
  ])

  return fetchJson<any>(url, options)
}

export function clearIndicatorCaches() {
  indicatorTreeCache.clear()
}

export const indicatorsService = {
  getIndicatorsByWorkgroup,
  getIndicatorHierarchy,
  getIndicatorValues,
  getIndicatorDataOptimized,
  clearCaches: clearIndicatorCaches,
}
