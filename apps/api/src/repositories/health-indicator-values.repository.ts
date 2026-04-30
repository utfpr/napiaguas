import { sql } from 'drizzle-orm'

import { db } from '../db/connection'

interface HealthIndicatorValueRow {
  codigoMunicipio: string
  municipio: string
  value: number
  normalizedValue: number | null
}

interface IndicatorResolution {
  id: string
  code: string
  workgroupId: string
}

export class HealthIndicatorValuesRepository {
  /**
   * Resolve indicador de saúde a partir de código ou UUID
   */
  private async resolveIndicator(
    indicatorIdentifier: string,
  ): Promise<IndicatorResolution | null> {
    const result = await db.execute<{
      id: string
      code: string
      workgroup_id: string
    }>(sql`
      SELECT id::text AS id, code, workgroup_id
      FROM indicator_hierarchy
      WHERE (code = ${indicatorIdentifier} OR id::text = ${indicatorIdentifier})
        AND workgroup_id = 'saude'
      LIMIT 1
    `)

    if (result.rows.length === 0) {
      return null
    }

    const row = result.rows[0]

    return {
      id: row.id,
      code: row.code,
      workgroupId: row.workgroup_id,
    }
  }

  /**
   * Busca valores de um indicador de saúde para todos os municípios
   * @param indicatorIdentifier - Código ou UUID do indicador
   * @returns Array de valores com código de município, nome, valor e valor normalizado
   */
  async getIndicatorValues(
    indicatorIdentifier: string,
  ): Promise<HealthIndicatorValueRow[]> {
    const indicator = await this.resolveIndicator(indicatorIdentifier)
    if (!indicator) {
      return []
    }

    const result = await db.execute<{
      codigo_municipio: string
      municipio: string
      value: string
      normalized_value: string | null
    }>(sql`
      SELECT
        hiv.codigo_municipio,
        mg.municipio,
        hiv.value::text AS value,
        hiv.normalized_value::text AS normalized_value
      FROM health_indicator_values hiv
      JOIN municipality_geometries mg ON hiv.codigo_municipio = mg.codigo
      WHERE hiv.indicator_id = ${indicator.id}
      ORDER BY mg.municipio
    `)

    return result.rows.map((row) => ({
      codigoMunicipio: row.codigo_municipio,
      municipio: row.municipio,
      value: Number(row.value),
      normalizedValue: row.normalized_value ? Number(row.normalized_value) : null,
    }))
  }

  /**
   * Verifica se um indicador de saúde existe
   * @param indicatorIdentifier - Código ou UUID do indicador
   * @returns true se o indicador existe e pertence ao workgroup saúde
   */
  async indicatorExists(indicatorIdentifier: string): Promise<boolean> {
    const indicator = await this.resolveIndicator(indicatorIdentifier)
    return indicator !== null
  }

  /**
   * Busca valor de um indicador para um município específico
   * @param indicatorIdentifier - Código ou UUID do indicador
   * @param codigoMunicipio - Código IBGE do município
   * @returns Valor do indicador ou undefined se não encontrado
   */
  async getIndicatorValueForMunicipality(
    indicatorIdentifier: string,
    codigoMunicipio: string,
  ): Promise<HealthIndicatorValueRow | undefined> {
    const indicator = await this.resolveIndicator(indicatorIdentifier)
    if (!indicator) {
      return undefined
    }

    const result = await db.execute<{
      codigo_municipio: string
      municipio: string
      value: string
      normalized_value: string | null
    }>(sql`
      SELECT
        hiv.codigo_municipio,
        mg.municipio,
        hiv.value::text AS value,
        hiv.normalized_value::text AS normalized_value
      FROM health_indicator_values hiv
      JOIN municipality_geometries mg ON hiv.codigo_municipio = mg.codigo
      WHERE hiv.indicator_id = ${indicator.id}
        AND hiv.codigo_municipio = ${codigoMunicipio}
      LIMIT 1
    `)

    if (result.rows.length === 0) {
      return undefined
    }

    const row = result.rows[0]

    return {
      codigoMunicipio: row.codigo_municipio,
      municipio: row.municipio,
      value: Number(row.value),
      normalizedValue: row.normalized_value ? Number(row.normalized_value) : null,
    }
  }
}

export const healthIndicatorValuesRepository = new HealthIndicatorValuesRepository()
