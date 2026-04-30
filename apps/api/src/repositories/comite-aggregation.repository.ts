import { eq, sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'

import { comiteAggregations, type NewComiteAggregation } from '../db/schema/comite-aggregations.schema'
import { indicatorHierarchy } from '../db/schema/indicator-hierarchy.schema'
import { db } from '../db/connection'

export interface AggregationWithDetails {
  comite_nome: string
  indicator_id: string
  indicator_name: string
  indicator_unit: string | null
  mean_value: number
  count: number
  min_value: number
  max_value: number
}

type DbClient = NodePgDatabase<any> | typeof db

export class ComiteAggregationRepository {
  async insertMany(
    aggregations: NewComiteAggregation[],
    client: DbClient = db,
  ): Promise<void> {
    if (aggregations.length === 0) {
      return
    }

    await client.insert(comiteAggregations).values(aggregations)
  }

  async deleteAll(client: DbClient = db): Promise<void> {
    await client.delete(comiteAggregations)
  }

  async findByIndicatorId(
    indicatorId: string,
    client: DbClient = db,
  ) {
    return client
      .select()
      .from(comiteAggregations)
      .where(eq(comiteAggregations.indicatorId, indicatorId))
  }

  async findAll(client: DbClient = db) {
    return client.select().from(comiteAggregations)
  }

  async findByComiteNome(
    comiteNome: string,
    client: DbClient = db,
  ) {
    return client
      .select()
      .from(comiteAggregations)
      .where(eq(comiteAggregations.comiteNome, comiteNome))
  }

  async count(client: DbClient = db): Promise<number> {
    const result = await client
      .select({ count: sql<number>`count(*)::integer` })
      .from(comiteAggregations)

    return result[0]?.count ?? 0
  }

  async findByIndicatorIdWithDetails(
    indicatorId: string,
    client: DbClient = db,
  ): Promise<AggregationWithDetails[]> {
    const result = await client
      .select({
        comite_nome: comiteAggregations.comiteNome,
        indicator_id: comiteAggregations.indicatorId,
        indicator_name: indicatorHierarchy.name,
        indicator_unit: indicatorHierarchy.unit,
        mean_value: comiteAggregations.meanValue,
        count: comiteAggregations.count,
        min_value: comiteAggregations.minValue,
        max_value: comiteAggregations.maxValue,
      })
      .from(comiteAggregations)
      .innerJoin(indicatorHierarchy, eq(comiteAggregations.indicatorId, indicatorHierarchy.id))
      .where(eq(comiteAggregations.indicatorId, indicatorId))
      .orderBy(sql`${comiteAggregations.meanValue} DESC`)

    return result.map((row) => ({
      comite_nome: row.comite_nome,
      indicator_id: row.indicator_id,
      indicator_name: row.indicator_name,
      indicator_unit: row.indicator_unit,
      mean_value: Number(row.mean_value),
      count: row.count,
      min_value: Number(row.min_value),
      max_value: Number(row.max_value),
    }))
  }

  async findAllWithDetails(client: DbClient = db): Promise<AggregationWithDetails[]> {
    const result = await client
      .select({
        comite_nome: comiteAggregations.comiteNome,
        indicator_id: comiteAggregations.indicatorId,
        indicator_name: indicatorHierarchy.name,
        indicator_unit: indicatorHierarchy.unit,
        mean_value: comiteAggregations.meanValue,
        count: comiteAggregations.count,
        min_value: comiteAggregations.minValue,
        max_value: comiteAggregations.maxValue,
      })
      .from(comiteAggregations)
      .innerJoin(indicatorHierarchy, eq(comiteAggregations.indicatorId, indicatorHierarchy.id))
      .orderBy(sql`${comiteAggregations.meanValue} DESC`)

    return result.map((row) => ({
      comite_nome: row.comite_nome,
      indicator_id: row.indicator_id,
      indicator_name: row.indicator_name,
      indicator_unit: row.indicator_unit,
      mean_value: Number(row.mean_value),
      count: row.count,
      min_value: Number(row.min_value),
      max_value: Number(row.max_value),
    }))
  }

  async indicatorExistsInHierarchy(
    indicatorId: string,
    client: DbClient = db,
  ): Promise<boolean> {
    const result = await client
      .select({ id: indicatorHierarchy.id })
      .from(indicatorHierarchy)
      .where(eq(indicatorHierarchy.id, indicatorId))
      .limit(1)

    return result.length > 0
  }
}

export const comiteAggregationRepository = new ComiteAggregationRepository()
