import { eq, sql } from 'drizzle-orm'

import { db } from '../db/connection'
import {
  geometriesTransportes,
  indicatorData,
  indicatorHierarchy,
  indicators,
  indicatorsTransportes,
} from '../db/schema'
import type { IndicatorHierarchy as IndicatorHierarchyRow } from '../db/schema'
import { getIndicatorDisplayName } from '../lib/indicator-names'

type PublicIndicatorType = 'index' | 'subindex' | 'indicator'

const typeMap: Record<IndicatorHierarchyRow['type'], PublicIndicatorType> = {
  indice: 'index',
  subindice: 'subindex',
  indicador: 'indicator',
}

export interface IndicatorNode {
  id: string
  uuid: string
  code: string
  name: string
  description?: string
  unit?: string
  type: PublicIndicatorType
  order: number
  children: IndicatorNode[]
}

export interface IndicatorFlat {
  id: string
  uuid: string
  code: string
  parentUuid: string | null
  name: string
  description?: string
  unit?: string
  type: PublicIndicatorType
  order: number
}

export interface IndicatorLookup {
  id: string
  uuid: string
  code: string
  name: string
  type: PublicIndicatorType
  unit?: string | null
  description?: string | null
}

export interface IndicatorHierarchyTreeNode {
  id: string
  code: string
  name: string
  type: IndicatorHierarchyRow['type']
  parentId: string | null
  order: number
  unit?: string | null
  description?: string | null
  children: IndicatorHierarchyTreeNode[]
}

interface IndicatorRecord {
  uuid: string
  code: string
  parentUuid: string | null
  name: string
  description: string | null
  unit: string | null
  type: PublicIndicatorType
  order: number
}

export class IndicatorsRepository {
  async getIndicatorsByWorkgroup(
    workgroupId: string,
  ): Promise<IndicatorNode[]> {
    const records = await this.fetchIndicatorRecords(workgroupId)
    return this.buildIndicatorTree(records)
  }

  async getIndicatorsFlatByWorkgroup(
    workgroupId: string,
  ): Promise<IndicatorFlat[]> {
    const records = await this.fetchIndicatorRecords(workgroupId)
    return records.map((record) => ({
      id: record.code,
      uuid: record.uuid,
      code: record.code,
      parentUuid: record.parentUuid,
      name: record.name,
      description: record.description ?? undefined,
      unit: record.unit ?? undefined,
      type: record.type,
      order: record.order,
    }))
  }

  async findById(indicatorIdentifier: string): Promise<IndicatorLookup | undefined> {
    const hierarchyResult = await db.execute<{
      id: string
      code: string
      name: string
      type: IndicatorHierarchyRow['type']
      description: string | null
      unit: string | null
    }>(sql`
      SELECT id::text, code, name, type, description, unit
      FROM indicator_hierarchy
      WHERE (code = ${indicatorIdentifier} OR id::text = ${indicatorIdentifier})
      LIMIT 1
    `)

    if (hierarchyResult.rows.length > 0) {
      const row = hierarchyResult.rows[0]
      return {
        id: row.code,
        uuid: row.id,
        code: row.code,
        name: getIndicatorDisplayName(row.code) || row.name,
        type: typeMap[row.type],
        description: row.description,
        unit: row.unit,
      }
    }

    const legacyResult = await db.execute<{
      id: string
      name: string
      type: string
      description: string | null
      unit: string | null
    }>(sql`
      SELECT id, name, type::text AS type, description, unit
      FROM indicators
      WHERE id = ${indicatorIdentifier}
      LIMIT 1
    `)

    if (legacyResult.rows.length === 0) {
      return undefined
    }

    const legacy = legacyResult.rows[0]
    const legacyType = (legacy.type as PublicIndicatorType) ?? 'indicator'

    return {
      id: legacy.id,
      uuid: legacy.id,
      code: legacy.id,
      name: getIndicatorDisplayName(legacy.id) || legacy.name,
      type: legacyType,
      description: legacy.description,
      unit: legacy.unit,
    }
  }

  private async fetchIndicatorRecords(workgroupId: string): Promise<IndicatorRecord[]> {
    // Workgroups que usam a tabela indicator_hierarchy (nova estrutura)
    if (workgroupId === 'agua-doce' || workgroupId === 'saude') {
      const rows = await db
        .select()
        .from(indicatorHierarchy)
        .where(eq(indicatorHierarchy.workgroupId, workgroupId))
        .orderBy(indicatorHierarchy.order, indicatorHierarchy.code)

      return rows.map((row) => ({
        uuid: row.id,
        code: row.code,
        parentUuid: row.parentId,
        name: getIndicatorDisplayName(row.code) || row.name,
        description: row.description ?? null,
        unit: row.unit ?? null,
        type: typeMap[row.type],
        order: row.order ?? 0,
      }))
    }

    // Workgroups que ainda usam a tabela indicators (estrutura legada)
    const rows = await db
      .select()
      .from(indicators)
      .where(eq(indicators.workgroupId, workgroupId))
      .orderBy(indicators.order)

    return rows.map((row) => ({
      uuid: row.id,
      code: row.id,
      parentUuid: row.parentId,
      name: getIndicatorDisplayName(row.id) || row.name,
      description: row.description ?? null,
      unit: row.unit ?? null,
      type: (row.type as PublicIndicatorType) ?? 'indicator',
      order: row.order ?? 0,
    }))
  }

  private buildIndicatorTree(records: IndicatorRecord[]): IndicatorNode[] {
    const map = new Map<string, IndicatorNode>()
    const roots: IndicatorNode[] = []

    for (const record of records) {
      map.set(record.uuid, {
        id: record.code,
        uuid: record.uuid,
        code: record.code,
        name: record.name,
        description: record.description ?? undefined,
        unit: record.unit ?? undefined,
        type: record.type,
      order: record.order,
      children: [],
    })
  }

  for (const record of records) {
      const node = map.get(record.uuid)
      if (!node) continue

      if (record.parentUuid) {
        const parent = map.get(record.parentUuid)
        parent?.children.push(node)
      } else {
        roots.push(node)
      }
    }

    const sortByOrder = (nodes: IndicatorNode[]) => {
      nodes.sort((a, b) => a.order - b.order)
      nodes.forEach((child) => sortByOrder(child.children))
    }

    sortByOrder(roots)
    return roots
  }

  async getIndicatorHierarchyTree(
    workgroupId: string,
  ): Promise<IndicatorHierarchyTreeNode[]> {
    const rows = await db
      .select({
        id: indicatorHierarchy.id,
        code: indicatorHierarchy.code,
        name: indicatorHierarchy.name,
        type: indicatorHierarchy.type,
        parentId: indicatorHierarchy.parentId,
        order: indicatorHierarchy.order,
        unit: indicatorHierarchy.unit,
        description: indicatorHierarchy.description,
      })
      .from(indicatorHierarchy)
      .where(eq(indicatorHierarchy.workgroupId, workgroupId))
      .orderBy(indicatorHierarchy.order, indicatorHierarchy.code)

    const nodeMap = new Map<string, IndicatorHierarchyTreeNode>()
    const roots: IndicatorHierarchyTreeNode[] = []

    rows.forEach((row) => {
      nodeMap.set(row.id, {
        id: row.id,
        code: row.code,
        name: getIndicatorDisplayName(row.code) || row.name,
        type: row.type,
        parentId: row.parentId,
        order: row.order ?? 0,
        unit: row.unit,
        description: row.description,
        children: [],
      })
    })

    rows.forEach((row) => {
      const node = nodeMap.get(row.id)
      if (!node) return

      if (row.parentId) {
        const parent = nodeMap.get(row.parentId)
        parent?.children.push(node)
      } else {
        roots.push(node)
      }
    })

    const sortByOrder = (list: IndicatorHierarchyTreeNode[]) => {
      list.sort((a, b) => a.order - b.order)
      list.forEach((child) => sortByOrder(child.children))
    }

    sortByOrder(roots)
    return roots
  }
}

export const indicatorsRepository = new IndicatorsRepository()

export type IndicatorLevel = 'index' | 'subindex' | 'indicator'

export interface TransportesIndicatorRow {
  [key: string]: unknown
  id: string
  name: string
  description: string | null
  unit: string | null
  parent_id: string | null
  level: IndicatorLevel
  order: number
  metadata: Record<string, unknown> | null
  depth: number
  path: string[]
}

export interface TransportesIndicatorDataRow {
  [key: string]: unknown
  geometry_id: string
  geometry_name: string
  geometry_code: string | null
  road_type: 'federal' | 'estadual'
  length_km: number | null
  geometry: string
  value: number
  normalized_value: number | null
  indicator_metadata: Record<string, unknown> | null
  geometry_metadata: Record<string, unknown> | null
}

export class TransportesIndicatorsRepository {
  async findHierarchyByWorkgroup(
    workgroupId: string,
  ): Promise<TransportesIndicatorRow[]> {
    const result = await db.execute<TransportesIndicatorRow>(sql`
      -- Índices utilizados:
      --  * idx_indicators_transportes_workgroup (workgroup_id)
      --  * idx_indicators_transportes_parent (parent_id)
      --  * idx_indicators_transportes_level ("level")
      WITH RECURSIVE indicator_tree AS (
        SELECT
          id,
          name,
          description,
          unit,
          parent_id,
          level,
          "order",
          metadata,
          ARRAY[id] AS path,
          0 AS depth
        FROM ${indicatorsTransportes}
        WHERE workgroup_id = ${workgroupId} AND parent_id IS NULL

        UNION ALL

        SELECT
          i.id,
          i.name,
          i.description,
          i.unit,
          i.parent_id,
          i.level,
          i."order",
          i.metadata,
          it.path || i.id,
          it.depth + 1
        FROM ${indicatorsTransportes} i
        INNER JOIN indicator_tree it ON i.parent_id = it.id
        WHERE i.workgroup_id = ${workgroupId}
      )
      SELECT
        id,
        name,
        description,
        unit,
        parent_id,
        level,
        "order",
        metadata,
        path,
        depth
      FROM indicator_tree
      ORDER BY path, "order"
    `)

    return result.rows
  }

  async findDataByIndicator(
    indicatorId: string,
  ): Promise<TransportesIndicatorDataRow[]> {
    const result = await db.execute<TransportesIndicatorDataRow>(sql`
      -- Índices utilizados:
      --  * idx_indicator_data_geometry_indicator_unique (indicator_id)
      --  * idx_geometries_transportes_geometry (JOIN + ST_AsGeoJSON)
      SELECT
        g.id AS geometry_id,
        g.name AS geometry_name,
        g.code AS geometry_code,
        g.road_type AS road_type,
        g.length_km::float AS length_km,
        ST_AsGeoJSON(g.geometry) AS geometry,
        d.value::float AS value,
        d.normalized_value::float AS normalized_value,
        d.metadata AS indicator_metadata,
        g.metadata AS geometry_metadata
      FROM ${indicatorData} d
      INNER JOIN ${geometriesTransportes} g ON g.id = d.geometry_id
      WHERE d.indicator_id = ${indicatorId} AND g.workgroup_id = 'transportes'
      ORDER BY g.name
    `)

    return result.rows
  }

  async indicatorExists(indicatorId: string): Promise<boolean> {
    const result = await db.execute<{ exists: boolean }>(sql`
      SELECT EXISTS(
        SELECT 1 FROM ${indicatorsTransportes} WHERE id = ${indicatorId}
      ) AS exists
    `)

    return result.rows[0]?.exists ?? false
  }

  /**
   * Busca um indicador de transportes por ID
   * @param indicatorId - UUID do indicador
   * @returns Indicador encontrado ou undefined
   */
  async findById(indicatorId: string): Promise<{ id: string; name: string } | undefined> {
    const result = await db
      .select({
        id: indicatorsTransportes.id,
        name: indicatorsTransportes.name,
      })
      .from(indicatorsTransportes)
      .where(eq(indicatorsTransportes.id, indicatorId))
      .limit(1)

    return result[0]
  }
}

export const transportesIndicatorsRepository =
  new TransportesIndicatorsRepository()
