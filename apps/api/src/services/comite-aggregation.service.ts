import { sql } from 'drizzle-orm'

import { db } from '../db/connection'
import { comiteAggregations, type NewComiteAggregation } from '../db/schema/comite-aggregations.schema'
import { logger } from '../config/logger'
import {
  comiteAggregationRepository,
  type AggregationWithDetails,
} from '../repositories/comite-aggregation.repository'

interface AggregationRow extends Record<string, unknown> {
  comite_nome: string
  indicator_id: string
  mean_value: string
  count: number
  min_value: string
  max_value: string
}

export class ComiteAggregationService {
  async calculateAndPersist(): Promise<number> {
    logger.info('Iniciando cálculo de agregações por comitê...')

    const startTime = Date.now()
    let aggregationCount = 0

    await db.transaction(async (tx) => {
      // 1. Limpar agregações existentes
      await tx.delete(comiteAggregations)
      logger.info('Agregações existentes removidas')

      // 2. Calcular novas agregações via SQL agregado
      const result = await tx.execute<AggregationRow>(sql`
        SELECT
          hg.properties->>'NOME_COMIT' as comite_nome,
          iv.indicator_id::text as indicator_id,
          AVG(iv.value)::numeric(10,4) as mean_value,
          COUNT(*)::integer as count,
          MIN(iv.value)::numeric(10,4) as min_value,
          MAX(iv.value)::numeric(10,4) as max_value
        FROM indicator_values iv
        JOIN hydrobasins_geometries hg ON iv.hybas_id = hg.hybas_id
        WHERE hg.properties->>'NOME_COMIT' IS NOT NULL
        GROUP BY hg.properties->>'NOME_COMIT', iv.indicator_id
      `)

      if (result.rows.length === 0) {
        logger.warn('Nenhuma agregação encontrada - verifique se indicator_values está populado')
        return
      }

      // 3. Transformar para formato de inserção
      const aggregations: NewComiteAggregation[] = result.rows.map((row) => ({
        comiteNome: row.comite_nome,
        indicatorId: row.indicator_id,
        meanValue: row.mean_value,
        count: row.count,
        minValue: row.min_value,
        maxValue: row.max_value,
      }))

      // 4. Inserir novas agregações
      await tx.insert(comiteAggregations).values(aggregations)

      aggregationCount = aggregations.length
      logger.info({ count: aggregationCount }, 'Agregações calculadas e inseridas')
    })

    const duration = Date.now() - startTime
    logger.info({ durationMs: duration, count: aggregationCount }, 'Cálculo de agregações concluído')

    return aggregationCount
  }

  /**
   * Retorna todas as agregações com detalhes do indicador
   */
  async getAll(): Promise<AggregationWithDetails[]> {
    return comiteAggregationRepository.findAllWithDetails()
  }

  /**
   * Retorna agregações filtradas por indicador com detalhes
   */
  async getByIndicatorId(indicatorId: string): Promise<AggregationWithDetails[]> {
    return comiteAggregationRepository.findByIndicatorIdWithDetails(indicatorId)
  }

  /**
   * Verifica se um indicador existe na tabela indicator_hierarchy
   */
  async indicatorExists(indicatorId: string): Promise<boolean> {
    return comiteAggregationRepository.indicatorExistsInHierarchy(indicatorId)
  }
}

export const comiteAggregationService = new ComiteAggregationService()
