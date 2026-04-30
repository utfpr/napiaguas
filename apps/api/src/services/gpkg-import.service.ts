import { sql } from 'drizzle-orm'

import { db } from '@/db/connection'
import { uploadLogRepository } from '@/repositories/upload-log.repository'
import type { UploadImportStats } from '@/types/upload-stats'
import { logger } from '@/config/logger'
import type { ParsedGpkgData } from './gpkg-parser.service'

const GEOMETRY_SIMPLIFY_TOLERANCE = 0.001
const GEOMETRY_CHUNK_SIZE = 200
const INDICATOR_CHUNK_SIZE = 500

interface WorkgroupTableConfig {
  geometriesTable: string
  valuesTable: string
  idField: string
}

interface GeometryRecord {
  featureId: string
  geometry: NonNullable<ParsedGpkgData['features'][number]['geometry']>
  properties: Record<string, unknown>
  municipio?: string // Campo adicional para workgroup 'saude' e 'litoral'
  rodNum?: string // Campo adicional para workgroup 'transportes'
}

interface IndicatorValueRecord {
  indicatorId: string
  featureId: string
  value: number
  normalizedValue: number | null
}

interface IndicatorAccumulator {
  indicatorId: string
  code: string
  values: Array<{ featureId: string; value: number }>
}

const chunkArray = <T>(items: T[], size: number): T[][] => {
  if (size <= 0) {
    throw new Error('Chunk size must be greater than zero')
  }

  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

const normalizeKey = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase()

const toSixDecimalPlaces = (value: number): number =>
  Number.parseFloat(value.toFixed(6))

const toFourDecimalPlaces = (value: number): number =>
  Number.parseFloat(value.toFixed(4))

// Rodovias federais no Paraná têm número < 100; demais são consideradas estaduais.
const _getRoadType = (rodNum: string | null | undefined): 'federal' | 'estadual' => {
  if (!rodNum) return 'estadual'

  const num = Number.parseInt(rodNum, 10)
  if (!Number.isNaN(num) && num < 100) {
    return 'federal'
  }

  return 'estadual'
}

const isFiniteNumber = (value: unknown): value is number => {
  if (typeof value === 'number') {
    return Number.isFinite(value)
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed)
  }

  return false
}

// Duplica aspas simples para embutir strings com segurança em SQL cru.
const escapeSqlString = (str: string): string => str.replace(/'/g, "''")

export class GpkgImportService {
  constructor(private readonly clock: () => number = Date.now) {}

  private getTablesForWorkgroup(workgroupId: string): WorkgroupTableConfig {
    const configs: Record<string, WorkgroupTableConfig> = {
      'agua-doce': {
        geometriesTable: 'hydrobasins_geometries',
        valuesTable: 'indicator_values',
        idField: 'hybas_id',
      },
      saude: {
        geometriesTable: 'municipality_geometries',
        valuesTable: 'health_indicator_values',
        idField: 'codigo',
      },
      litoral: {
        geometriesTable: 'municipality_geometries',
        valuesTable: 'coastal_indicator_values',
        idField: 'codigo',
      },
      transportes: {
        geometriesTable: 'geometries_transportes',
        valuesTable: 'indicator_data',
        idField: 'Trecho',
      },
    }

    const config = configs[workgroupId]
    if (!config) {
      throw new Error(
        `Workgroup "${workgroupId}" não suportado. Workgroups disponíveis: ${Object.keys(configs).join(', ')}`,
      )
    }

    return config
  }

  async importToDatabase(
    uploadId: string,
    gpkgData: ParsedGpkgData,
  ): Promise<UploadImportStats> {
    const startedAt = this.clock()

    const uploadLog = await uploadLogRepository.getLog(uploadId)
    if (!uploadLog) {
      throw new Error(`UploadLog ${uploadId} não encontrado para importação`)
    }

    const tableConfig = this.getTablesForWorkgroup(uploadLog.workgroupId)
    logger.info(
      {
        uploadId,
        workgroupId: uploadLog.workgroupId,
        tableConfig,
      },
      'Configuração de tabelas determinada para workgroup',
    )

    const features = gpkgData.features
    if (!features || features.length === 0) {
      throw new Error('Arquivo GPKG não contém features para importação')
    }

    const invalidGeometrySet = new Set<string>()

    const geometries: GeometryRecord[] = []
    const indicatorAccumulator = new Map<string, IndicatorAccumulator>()
    const featureIds: string[] = []
    const seenFeatureIds = new Set<string>()

    const indicatorLookup = await this.buildIndicatorLookup(uploadLog.workgroupId)

    // Para transportes, carregar mapeamento de colunas
    let transportesColumnMapping: Record<string, string> | null = null
    if (uploadLog.workgroupId === 'transportes') {
      const { TRANSPORTES_COLUMN_MAPPING } = await import('@/config/gpkg-schemas')
      transportesColumnMapping = TRANSPORTES_COLUMN_MAPPING
    }

    for (const feature of features) {
      // Determinar o campo ID baseado no workgroup
      const idFieldName =
        uploadLog.workgroupId === 'agua-doce'
          ? 'HYBAS_ID'
          : uploadLog.workgroupId === 'saude'
            ? 'Codigo'
            : uploadLog.workgroupId === 'litoral'
              ? 'CD_MUN'
              : uploadLog.workgroupId === 'transportes'
                ? 'Trecho'
                : null

      if (!idFieldName) {
        throw new Error(`Campo ID desconhecido para workgroup "${uploadLog.workgroupId}"`)
      }

      const featureIdRaw = feature.properties?.[idFieldName]
      const featureId =
        typeof featureIdRaw === 'string' ? featureIdRaw : String(featureIdRaw ?? '').trim()

      if (!featureId) {
        throw new Error(
          `Feature sem ${idFieldName} válido detectada durante importação (workgroup: ${uploadLog.workgroupId})`,
        )
      }

      if (!feature.geometry) {
        throw new Error(`Geometria ausente para ${idFieldName} ${featureId}`)
      }

      if (seenFeatureIds.has(featureId)) {
        throw new Error(
          `${idFieldName} duplicado detectado: ${featureId} (workgroup: ${uploadLog.workgroupId})`,
        )
      }
      seenFeatureIds.add(featureId)
      featureIds.push(featureId)

      const properties = { ...feature.properties }
      delete properties[idFieldName]

      // Para workgroups saude e litoral, extrair o campo Municipio/NM_MUN obrigatório
      let municipio: string | undefined
      if (uploadLog.workgroupId === 'saude' || uploadLog.workgroupId === 'litoral') {
        const municipioFieldName = uploadLog.workgroupId === 'saude' ? 'Municipio' : 'NM_MUN'
        const municipioRaw = feature.properties?.[municipioFieldName]
        municipio = typeof municipioRaw === 'string' ? municipioRaw : String(municipioRaw ?? '').trim()
        if (!municipio) {
          throw new Error(
            `Feature sem campo ${municipioFieldName} válido para workgroup ${uploadLog.workgroupId} (${idFieldName}: ${featureId})`,
          )
        }
        delete properties[municipioFieldName]
      }

      // Para workgroup transportes, extrair campos específicos de rodovia
      let rodNum: string | undefined
      if (uploadLog.workgroupId === 'transportes') {
        const rodNumRaw = feature.properties?.['Rod_num']
        rodNum = typeof rodNumRaw === 'string' ? rodNumRaw : String(rodNumRaw ?? '').trim()
        // Rod_num não é obrigatório, mas se existir, armazenar em properties
      }

      geometries.push({
        featureId,
        geometry: feature.geometry,
        properties,
        municipio,
        rodNum,
      })

      if (!feature.properties) {
        continue
      }

      for (const [rawKey, rawValue] of Object.entries(feature.properties)) {
        if (!rawKey || rawKey === 'HYBAS_ID') {
          continue
        }

        // Para transportes, aplicar mapeamento de nomes de colunas
        let keyToLookup = rawKey
        if (transportesColumnMapping && transportesColumnMapping[rawKey]) {
          keyToLookup = transportesColumnMapping[rawKey]
        }

        const normalizedKey = normalizeKey(keyToLookup)
        let indicators = indicatorLookup.get(normalizedKey)

        // Para transportes, sempre buscar por prefixo se o nome mapeado tiver sufixo entre parênteses
        // Isso garante que colunas como CWD, Grau_declv populem TODOS os indicadores com o mesmo nome base
        if (uploadLog.workgroupId === 'transportes' && /\([^)]+\)\s*$/.test(keyToLookup)) {
          const allIndicators: Array<{ indicatorId: string; code: string }> = []

          // Remove o sufixo "(Deslizamento)", "(Inundação)" antes de normalizar
          // — normalizeKey remove parênteses e perderíamos a distinção.
          const baseName = keyToLookup.replace(/\s*\([^)]*\)\s*$/, '').trim()
          const baseNormalizedKey = normalizeKey(baseName)

          for (const [_key, values] of indicatorLookup.entries()) {
            const originalName = values[0].code
            const baseOriginalName = originalName.replace(/\s*\([^)]*\)\s*$/, '').trim()
            const baseKey = normalizeKey(baseOriginalName)

            if (baseKey === baseNormalizedKey) {
              allIndicators.push(...values)
            }
          }

          if (allIndicators.length > 0) {
            indicators = allIndicators
          }
        }

        if (!indicators || indicators.length === 0) {
          continue
        }

        if (rawValue === null || rawValue === undefined || rawValue === '') {
          // Pular valores nulos, mantendo normalized_value como null
          continue
        }

        if (!isFiniteNumber(rawValue)) {
          throw new Error(
            `Valor inválido encontrado para indicador "${indicators[0].code}" (${idFieldName} ${featureId}): ${rawValue}`,
          )
        }

        const numericValue =
          typeof rawValue === 'number' ? rawValue : Number.parseFloat(String(rawValue))

        // Se houver múltiplos indicadores para a mesma coluna (ex: CWD), adicionar valor para todos
        for (const indicator of indicators) {
          let accumulator = indicatorAccumulator.get(indicator.indicatorId)
          if (!accumulator) {
            accumulator = {
              indicatorId: indicator.indicatorId,
              code: indicator.code,
              values: [],
            }
            indicatorAccumulator.set(indicator.indicatorId, accumulator)
          }

          accumulator.values.push({
            featureId,
            value: numericValue,
          })
        }
      }
    }

    const stats: UploadImportStats = {
      featuresProcessed: features.length,
      geometriesInserted: 0,
      geometriesUpdated: 0,
      indicatorsInserted: 0,
      indicatorsUpdated: 0,
      indicatorsLoaded: indicatorAccumulator.size,
      processingTimeMs: 0,
      invalidGeometriesCount: 0,
      invalidGeometryFeatures: [],
    }

    await db.transaction(async (tx) => {
      // Usar funções específicas para transportes
      const isTransportes = uploadLog.workgroupId === 'transportes'

      for (const chunk of chunkArray(geometries, GEOMETRY_CHUNK_SIZE)) {
        try {
          const result = await this.withSavepoint(tx, 'gpkg_chunk', () =>
            isTransportes
              ? this.insertTransportesGeometryChunk(tx, chunk)
              : this.insertGeometryChunk(tx, chunk, tableConfig),
          )

          const idFieldForResult = isTransportes ? 'code' : tableConfig.idField
          const insertedFeatureIds = new Set(
            result.rows.map((row: any) => row[idFieldForResult]),
          )

          for (const row of result.rows) {
            if (row.inserted) {
              stats.geometriesInserted += 1
            } else {
              stats.geometriesUpdated += 1
            }
          }

          for (const item of chunk) {
            if (!insertedFeatureIds.has(item.featureId)) {
              invalidGeometrySet.add(item.featureId)
            }
          }
        } catch (error) {
          logger.warn(
            {
              err: error,
              chunkSize: chunk.length,
              firstFeatureId: chunk[0]?.featureId,
              causeMessage:
                error && typeof error === 'object' && 'cause' in error
                  ? (error as { cause?: unknown }).cause &&
                    typeof (error as { cause?: unknown }).cause === 'object' &&
                    (error as { cause?: { message?: string } }).cause?.message
                  : undefined,
            },
            'Falha ao inserir lote de geometrias; tentando processamento individual',
          )

          for (const item of chunk) {
            try {
              const outcome = await this.withSavepoint(tx, 'gpkg_single', () =>
                isTransportes
                  ? this.insertTransportesGeometrySingle(tx, item)
                  : this.insertGeometrySingle(tx, item, tableConfig),
              )

              if (outcome === 'inserted') {
                stats.geometriesInserted += 1
              } else if (outcome === 'updated') {
                stats.geometriesUpdated += 1
              } else {
                invalidGeometrySet.add(item.featureId)
              }
            } catch (singleError) {
              logger.warn(
                {
                  err: singleError,
                  featureId: item.featureId,
                  causeMessage:
                    singleError && typeof singleError === 'object' && 'cause' in singleError
                      ? (singleError as { cause?: unknown }).cause &&
                        typeof (singleError as { cause?: unknown }).cause === 'object' &&
                        (singleError as { cause?: { message?: string } }).cause?.message
                      : undefined,
                },
                'Falha ao processar geometria individual; marcando como inválida',
              )
              invalidGeometrySet.add(item.featureId)
            }
          }
        }
      }

      const totalGeometriesProcessed = stats.geometriesInserted + stats.geometriesUpdated
      if (totalGeometriesProcessed !== stats.featuresProcessed) {
        throw new Error(
          `Inconsistência na importação de geometrias: esperado ${stats.featuresProcessed}, processado ${totalGeometriesProcessed}`,
        )
      }

      const featureIdsJson = JSON.stringify(featureIds)
      const safeFeatureIdsJson = escapeSqlString(featureIdsJson)

      // Validação de geometrias diferente para transportes (sem simplified_geometry)
      if (isTransportes) {
        const invalidGeometry = await tx.execute(sql.raw(`
          WITH ids AS (
            SELECT value::text AS feature_id
            FROM jsonb_array_elements_text('${safeFeatureIdsJson}'::jsonb)
          )
          SELECT g.code
          FROM geometries_transportes g
          INNER JOIN ids ON ids.feature_id = g.code
          WHERE NOT ST_IsValid(g.geometry)
          LIMIT 1
        `))

        if (invalidGeometry.rows.length > 0) {
          const invalidId = invalidGeometry.rows[0].code
          throw new Error(
            `Geometria inválida detectada após importação de transportes (code ${invalidId})`,
          )
        }
      } else {
        const invalidGeometry = await tx.execute(sql.raw(`
          WITH ids AS (
            SELECT value::text AS feature_id
            FROM jsonb_array_elements_text('${safeFeatureIdsJson}'::jsonb)
          )
          SELECT g.${tableConfig.idField}
          FROM ${tableConfig.geometriesTable} g
          INNER JOIN ids ON ids.feature_id = g.${tableConfig.idField}
          WHERE NOT ST_IsValid(COALESCE(g.simplified_geometry, g.geometry))
          LIMIT 1
        `))

        if (invalidGeometry.rows.length > 0) {
          const invalidId = invalidGeometry.rows[0][tableConfig.idField]
          throw new Error(
            `Geometria inválida detectada após importação (${tableConfig.idField} ${invalidId})`,
          )
        }
      }

      const indicatorRecords = this.buildIndicatorRecords(indicatorAccumulator)

      if (indicatorRecords.length > 0) {
        for (const chunk of chunkArray(indicatorRecords, INDICATOR_CHUNK_SIZE)) {
          const payload = JSON.stringify(
            chunk.map((record) => ({
              indicator_id: record.indicatorId,
              feature_id: record.featureId,
              value: record.value,
              normalized_value: record.normalizedValue,
            })),
          )

          // Escapar aspas simples no JSON para prevenir SQL injection
          const safePayload = escapeSqlString(payload)

          // Para transportes, usar tabela indicator_data com geometry_id (UUID)
          if (isTransportes) {
            const result = await tx.execute(sql.raw(`
              WITH input AS (
                SELECT
                  (data->>'indicator_id')::uuid AS indicator_id,
                  data->>'feature_id' AS feature_id,
                  NULLIF(data->>'value', '')::numeric AS value,
                  NULLIF(data->>'normalized_value', '')::numeric AS normalized_value
                FROM jsonb_array_elements('${safePayload}'::jsonb) AS data
              )
              INSERT INTO indicator_data (
                indicator_id,
                geometry_id,
                value,
                normalized_value
              )
              SELECT
                input.indicator_id,
                g.id,
                input.value,
                input.normalized_value
              FROM input
              INNER JOIN geometries_transportes g ON g.code = input.feature_id
              ON CONFLICT (geometry_id, indicator_id) DO UPDATE SET
                value = EXCLUDED.value,
                normalized_value = EXCLUDED.normalized_value,
                updated_at = NOW()
              RETURNING (xmax = 0) AS inserted
            `))

            for (const row of result.rows) {
              if (row.inserted) {
                stats.indicatorsInserted += 1
              } else {
                stats.indicatorsUpdated += 1
              }
            }
          } else {
            // Lógica existente para outros workgroups
            const result = await tx.execute(sql.raw(`
              WITH input AS (
                SELECT
                  (data->>'indicator_id')::uuid AS indicator_id,
                  data->>'feature_id' AS feature_id,
                  NULLIF(data->>'value', '')::numeric AS value,
                  NULLIF(data->>'normalized_value', '')::numeric AS normalized_value
                FROM jsonb_array_elements('${safePayload}'::jsonb) AS data
              )
              INSERT INTO ${tableConfig.valuesTable} (
                indicator_id,
                ${tableConfig.idField === 'hybas_id' ? 'hybas_id' : 'codigo_municipio'},
                value,
                normalized_value
              )
              SELECT
                input.indicator_id,
                input.feature_id,
                input.value,
                input.normalized_value
              FROM input
              ON CONFLICT (indicator_id, ${tableConfig.idField === 'hybas_id' ? 'hybas_id' : 'codigo_municipio'}) DO UPDATE SET value = EXCLUDED.value, normalized_value = EXCLUDED.normalized_value, updated_at = NOW()
              RETURNING (xmax = 0) AS inserted
            `))

            for (const row of result.rows) {
              if (row.inserted) {
                stats.indicatorsInserted += 1
              } else {
                stats.indicatorsUpdated += 1
              }
            }
          }
        }

        const totalIndicatorRecords = stats.indicatorsInserted + stats.indicatorsUpdated
        if (totalIndicatorRecords !== indicatorRecords.length) {
          throw new Error(
            `Inconsistência na importação de indicadores: esperado ${indicatorRecords.length}, processado ${totalIndicatorRecords}`,
          )
        }

        const indicatorIdsJson = JSON.stringify(Array.from(indicatorAccumulator.keys()))
        const safeIndicatorIdsJson = escapeSqlString(indicatorIdsJson)

        // Validação de órfãos diferente para transportes
        if (isTransportes) {
          const orphanIndicator = await tx.execute(sql.raw(`
            WITH indicator_ids AS (
              SELECT value::uuid AS indicator_id
              FROM jsonb_array_elements_text('${safeIndicatorIdsJson}'::jsonb)
            )
            SELECT iv.indicator_id::text AS indicator_id, iv.geometry_id::text
            FROM indicator_data iv
            INNER JOIN indicator_ids iid ON iid.indicator_id = iv.indicator_id
            LEFT JOIN geometries_transportes g ON g.id = iv.geometry_id
            WHERE g.id IS NULL
            LIMIT 1
          `))

          if (orphanIndicator.rows.length > 0) {
            throw new Error(
              `Valor de indicador órfão detectado para transportes (indicator_id=${orphanIndicator.rows[0].indicator_id}, geometry_id=${orphanIndicator.rows[0].geometry_id})`,
            )
          }
        } else {
          const orphanIndicator = await tx.execute(sql.raw(`
            WITH indicator_ids AS (
              SELECT value::uuid AS indicator_id
              FROM jsonb_array_elements_text('${safeIndicatorIdsJson}'::jsonb)
            ),
            feature_ids AS (
              SELECT value::text AS feature_id
              FROM jsonb_array_elements_text('${safeFeatureIdsJson}'::jsonb)
            )
            SELECT iv.indicator_id::text AS indicator_id, iv.${tableConfig.idField === 'hybas_id' ? 'hybas_id' : 'codigo_municipio'} AS feature_id
            FROM ${tableConfig.valuesTable} iv
            INNER JOIN indicator_ids iid ON iid.indicator_id = iv.indicator_id
            INNER JOIN feature_ids fid ON fid.feature_id = iv.${tableConfig.idField === 'hybas_id' ? 'hybas_id' : 'codigo_municipio'}
            LEFT JOIN ${tableConfig.geometriesTable} g ON g.${tableConfig.idField} = iv.${tableConfig.idField === 'hybas_id' ? 'hybas_id' : 'codigo_municipio'}
            WHERE g.${tableConfig.idField} IS NULL
            LIMIT 1
          `))

          if (orphanIndicator.rows.length > 0) {
            throw new Error(
              `Valor de indicador órfão detectado (indicator_id=${orphanIndicator.rows[0].indicator_id}, ${tableConfig.idField}=${orphanIndicator.rows[0].feature_id})`,
            )
          }
        }
      } else {
        logger.warn(
          {
            uploadId,
            workgroupId: uploadLog.workgroupId,
          },
          'Nenhum indicador reconhecido foi encontrado no arquivo GPKG importado',
        )
      }
    })

    stats.invalidGeometriesCount = invalidGeometrySet.size
    stats.invalidGeometryFeatures = Array.from(invalidGeometrySet)
    stats.processingTimeMs = this.clock() - startedAt

    logger.info(
      {
        uploadId,
        workgroupId: uploadLog.workgroupId,
        stats,
      },
      'Importação de GPKG concluída com sucesso',
    )

    return stats
  }

  private async buildIndicatorLookup(workgroupId: string) {
    // Para transportes, usar tabela indicators_transportes que não tem campo 'code', apenas 'name'
    const isTransportes = workgroupId === 'transportes'

    const indicators = await db.execute<{
      indicator_id: string
      code: string
    }>(
      isTransportes
        ? sql`
            SELECT id::text AS indicator_id, name AS code
            FROM indicators_transportes
            WHERE workgroup_id = ${workgroupId}
              AND level IN ('index', 'subindex', 'indicator')
          `
        : sql`
            SELECT id::text AS indicator_id, code
            FROM indicator_hierarchy
            WHERE workgroup_id = ${workgroupId}
              AND type IN ('indice', 'subindice', 'indicador')
          `,
    )

    if (indicators.rows.length === 0) {
      throw new Error(
        `Nenhum indicador configurado para o workgroup "${workgroupId}" foi encontrado`,
      )
    }

    const lookup = new Map<
      string,
      Array<{
        indicatorId: string
        code: string
      }>
    >()

    for (const row of indicators.rows) {
      const normalizedCode = normalizeKey(row.code)
      const existing = lookup.get(normalizedCode) || []
      existing.push({
        indicatorId: row.indicator_id,
        code: row.code,
      })
      lookup.set(normalizedCode, existing)
    }

    return lookup
  }

  private buildIndicatorRecords(
    accumulator: Map<string, IndicatorAccumulator>,
  ): IndicatorValueRecord[] {
    const records: IndicatorValueRecord[] = []

    for (const { indicatorId, values } of accumulator.values()) {
      if (values.length === 0) {
        continue
      }

      const numericValues = values.map((entry) => entry.value)
      const min = Math.min(...numericValues)
      const max = Math.max(...numericValues)
      const range = max - min

      for (const entry of values) {
        const normalized =
          range === 0
            ? toFourDecimalPlaces(0.5)
            : toFourDecimalPlaces((entry.value - min) / range)

        records.push({
          indicatorId,
          featureId: entry.featureId,
          value: toSixDecimalPlaces(entry.value),
          normalizedValue: normalized,
        })
      }
    }

    return records
  }

  // Insere um chunk de LineStrings de transportes, reprojetando de EPSG:31982 para 4326 e calculando length_km.
  private async insertTransportesGeometryChunk(tx: any, chunk: GeometryRecord[]) {
    const payload = JSON.stringify(
      chunk.map((item) => ({
        feature_id: item.featureId,
        geometry: item.geometry,
        properties: item.properties,
        rod_num: item.rodNum || '',
      })),
    )

    const safePayload = escapeSqlString(payload)

    return tx.execute(sql.raw(`
      WITH input AS (
        SELECT
          data->>'feature_id' AS feature_id,
          data->'geometry' AS geometry,
          data->'properties' AS properties,
          data->>'rod_num' AS rod_num
        FROM jsonb_array_elements('${safePayload}'::jsonb) AS data
      ),
      prepared AS (
        SELECT
          feature_id,
          properties,
          rod_num,
          ST_MakeValid(
            ST_Transform(
              ST_SetSRID(ST_GeomFromGeoJSON(geometry::text), 31982),
              4326
            )
          ) AS raw_geometry
        FROM input
      ),
      with_length AS (
        SELECT
          feature_id,
          properties,
          rod_num,
          raw_geometry,
          ST_Length(ST_Transform(raw_geometry, 31982)) / 1000 AS length_km
        FROM prepared
      ),
      final AS (
        SELECT
          feature_id,
          properties,
          rod_num,
          CASE
            WHEN raw_geometry IS NULL OR ST_IsEmpty(raw_geometry) THEN NULL
            ELSE raw_geometry
          END AS valid_geometry,
          length_km
        FROM with_length
      )
      INSERT INTO geometries_transportes (
        code,
        name,
        road_type,
        geometry,
        length_km,
        metadata,
        workgroup_id
      )
      SELECT
        feature_id,
        feature_id,
        CASE
          WHEN rod_num = '' THEN 'estadual'::road_type_enum
          WHEN CAST(rod_num AS INTEGER) < 100 THEN 'federal'::road_type_enum
          ELSE 'estadual'::road_type_enum
        END,
        valid_geometry,
        length_km,
        properties::jsonb,
        'transportes'
      FROM final
      WHERE valid_geometry IS NOT NULL AND NOT ST_IsEmpty(valid_geometry)
      ON CONFLICT (code) DO UPDATE SET
        geometry = EXCLUDED.geometry,
        length_km = EXCLUDED.length_km,
        metadata = EXCLUDED.metadata,
        updated_at = NOW()
      RETURNING code, (xmax = 0) AS inserted
    `))
  }

  private async insertTransportesGeometrySingle(
    tx: any,
    item: GeometryRecord,
  ): Promise<'inserted' | 'updated' | 'invalid'> {
    const geometryJson = JSON.stringify(item.geometry)
    const propertiesJson = JSON.stringify(item.properties ?? {})
    const rodNum = item.rodNum || ''

    const safeGeometryJson = escapeSqlString(geometryJson)
    const safePropertiesJson = escapeSqlString(propertiesJson)
    const safeRodNum = escapeSqlString(rodNum)
    const safeFeatureId = escapeSqlString(item.featureId)

    const result = await tx.execute(sql.raw(`
      WITH input AS (
        SELECT
          '${safeFeatureId}'::text AS feature_id,
          '${safeGeometryJson}'::json AS geometry,
          '${safePropertiesJson}'::json AS properties,
          '${safeRodNum}'::text AS rod_num
      ),
      prepared AS (
        SELECT
          feature_id,
          properties,
          rod_num,
          ST_MakeValid(
            ST_Transform(
              ST_SetSRID(ST_GeomFromGeoJSON(geometry::text), 31982),
              4326
            )
          ) AS raw_geometry
        FROM input
      ),
      with_length AS (
        SELECT
          feature_id,
          properties,
          rod_num,
          raw_geometry,
          ST_Length(ST_Transform(raw_geometry, 31982)) / 1000 AS length_km
        FROM prepared
      ),
      final AS (
        SELECT
          feature_id,
          properties,
          rod_num,
          CASE
            WHEN raw_geometry IS NULL OR ST_IsEmpty(raw_geometry) THEN NULL
            ELSE raw_geometry
          END AS valid_geometry,
          length_km
        FROM with_length
      )
      INSERT INTO geometries_transportes (
        code,
        name,
        road_type,
        geometry,
        length_km,
        metadata,
        workgroup_id
      )
      SELECT
        feature_id,
        feature_id,
        CASE
          WHEN rod_num = '' THEN 'estadual'::road_type_enum
          WHEN CAST(rod_num AS INTEGER) < 100 THEN 'federal'::road_type_enum
          ELSE 'estadual'::road_type_enum
        END,
        valid_geometry,
        length_km,
        properties::jsonb,
        'transportes'
      FROM final
      WHERE valid_geometry IS NOT NULL AND NOT ST_IsEmpty(valid_geometry)
      ON CONFLICT (code) DO UPDATE SET
        geometry = EXCLUDED.geometry,
        length_km = EXCLUDED.length_km,
        metadata = EXCLUDED.metadata,
        updated_at = NOW()
      RETURNING (xmax = 0) AS inserted
    `))

    if (result.rows.length === 0) {
      return 'invalid'
    }

    return result.rows[0].inserted ? 'inserted' : 'updated'
  }

  private async withSavepoint<T>(
    tx: any,
    name: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    await tx.execute(sql.raw(`SAVEPOINT ${name}`))

    try {
      const result = await fn()
      await tx.execute(sql.raw(`RELEASE SAVEPOINT ${name}`))
      return result
    } catch (error) {
      try {
        await tx.execute(sql.raw(`ROLLBACK TO SAVEPOINT ${name}`))
      } catch {}

      try {
        await tx.execute(sql.raw(`RELEASE SAVEPOINT ${name}`))
      } catch {}

      throw error
    }
  }

  private async insertGeometryChunk(
    tx: any,
    chunk: GeometryRecord[],
    tableConfig: WorkgroupTableConfig,
  ) {
    const payload = JSON.stringify(
      chunk.map((item) => ({
        feature_id: item.featureId,
        geometry: item.geometry,
        properties: item.properties,
        ...(item.municipio !== undefined && { municipio: item.municipio }),
      })),
    )

    // Escapar aspas simples no JSON para prevenir SQL injection
    const safePayload = escapeSqlString(payload)

    // Para saúde (codigo), precisamos também do campo municipio
    const hasMunicipioField = tableConfig.idField === 'codigo'
    const municipioFieldSelect = hasMunicipioField ? `, data->>'municipio' AS municipio` : ''
    const municipioFieldInsert = hasMunicipioField ? `, municipio` : ''
    const municipioFieldValue = hasMunicipioField ? `, municipio` : ''

    return tx.execute(sql.raw(`
      WITH input AS (
        SELECT
          data->>'feature_id' AS feature_id,
          data->'geometry' AS geometry,
          data->'properties' AS properties
          ${municipioFieldSelect}
        FROM jsonb_array_elements('${safePayload}'::jsonb) AS data
      ),
      prepared AS (
        SELECT
          feature_id,
          properties,
          ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON(geometry::text), 4326)) AS raw_geometry
          ${hasMunicipioField ? `, municipio` : ''}
        FROM input
      ),
      sanitized AS (
        SELECT
          feature_id,
          properties,
          ST_Multi(ST_CollectionExtract(raw_geometry, 3)) AS valid_geometry
          ${hasMunicipioField ? `, municipio` : ''}
        FROM prepared
      ),
      simplified AS (
        SELECT
          feature_id,
          properties,
          valid_geometry,
          ${hasMunicipioField ? `municipio,` : ''}
          CASE
            WHEN valid_geometry IS NULL OR ST_IsEmpty(valid_geometry) THEN NULL
            ELSE ST_SimplifyPreserveTopology(valid_geometry, ${GEOMETRY_SIMPLIFY_TOLERANCE})
          END AS simplified_candidate
        FROM sanitized
      ),
      final AS (
        SELECT
          feature_id,
          properties,
          ${hasMunicipioField ? `municipio,` : ''}
          CASE
            WHEN valid_geometry IS NULL OR ST_IsEmpty(valid_geometry) THEN NULL
            ELSE valid_geometry
          END AS valid_geometry,
          CASE
            WHEN simplified_candidate IS NULL OR NOT ST_IsValid(simplified_candidate) THEN NULL
            ELSE simplified_candidate
          END AS simplified_geometry
        FROM simplified
      )
      INSERT INTO ${tableConfig.geometriesTable} (
        ${tableConfig.idField},
        geometry,
        simplified_geometry,
        properties
        ${municipioFieldInsert}
      )
      SELECT
        feature_id,
        valid_geometry,
        COALESCE(simplified_geometry, valid_geometry),
        properties::jsonb
        ${municipioFieldValue}
      FROM final
      WHERE valid_geometry IS NOT NULL AND NOT ST_IsEmpty(valid_geometry)
      ON CONFLICT (${tableConfig.idField}) DO UPDATE SET geometry = EXCLUDED.geometry, simplified_geometry = EXCLUDED.simplified_geometry, properties = EXCLUDED.properties, updated_at = NOW()
      RETURNING ${tableConfig.idField}, (xmax = 0) AS inserted
    `))
  }

  private async insertGeometrySingle(
    tx: any,
    item: GeometryRecord,
    tableConfig: WorkgroupTableConfig,
  ): Promise<'inserted' | 'updated' | 'invalid'> {
    const geometryJson = JSON.stringify(item.geometry)
    const propertiesJson = JSON.stringify(item.properties ?? {})
    const hasMunicipioField = tableConfig.idField === 'codigo'
    const municipioValue = item.municipio ?? ''

    // Escapar aspas simples para prevenir SQL injection
    const safeGeometryJson = escapeSqlString(geometryJson)
    const safePropertiesJson = escapeSqlString(propertiesJson)
    const safeMunicipioValue = escapeSqlString(municipioValue)

    const municipioFieldSelect = hasMunicipioField ? `, '${safeMunicipioValue}'::text AS municipio` : ''
    const municipioFieldInsert = hasMunicipioField ? `, municipio` : ''
    const municipioFieldValue = hasMunicipioField ? `, municipio` : ''
    const municipioFieldCTE = hasMunicipioField ? `, municipio` : ''

    const safeFeatureId = escapeSqlString(item.featureId)

    const result = await tx.execute(sql.raw(`
        WITH input AS (
          SELECT
            '${safeFeatureId}'::text AS feature_id,
            '${safeGeometryJson}'::json AS geometry,
            '${safePropertiesJson}'::json AS properties
            ${municipioFieldSelect}
        ),
        prepared AS (
          SELECT
            feature_id,
            properties,
            ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON(geometry::text), 4326)) AS raw_geometry
            ${municipioFieldCTE}
          FROM input
        ),
        sanitized AS (
          SELECT
            feature_id,
            properties,
            ST_Multi(ST_CollectionExtract(raw_geometry, 3)) AS valid_geometry
            ${municipioFieldCTE}
          FROM prepared
        ),
        simplified AS (
          SELECT
            feature_id,
            properties,
            valid_geometry,
            ${hasMunicipioField ? 'municipio,' : ''}
            CASE
              WHEN valid_geometry IS NULL OR ST_IsEmpty(valid_geometry) THEN NULL
              ELSE ST_SimplifyPreserveTopology(valid_geometry, ${GEOMETRY_SIMPLIFY_TOLERANCE})
            END AS simplified_candidate
          FROM sanitized
        ),
        final AS (
          SELECT
            feature_id,
            properties,
            ${hasMunicipioField ? 'municipio,' : ''}
            CASE
              WHEN valid_geometry IS NULL OR ST_IsEmpty(valid_geometry) THEN NULL
              ELSE valid_geometry
            END AS valid_geometry,
            CASE
              WHEN simplified_candidate IS NULL OR NOT ST_IsValid(simplified_candidate) THEN NULL
              ELSE simplified_candidate
            END AS simplified_geometry
          FROM simplified
        )
        INSERT INTO ${tableConfig.geometriesTable} (
          ${tableConfig.idField},
          geometry,
          simplified_geometry,
          properties
          ${municipioFieldInsert}
        )
        SELECT
          feature_id,
          valid_geometry,
          COALESCE(simplified_geometry, valid_geometry),
          properties::jsonb
          ${municipioFieldValue}
        FROM final
        WHERE valid_geometry IS NOT NULL AND NOT ST_IsEmpty(valid_geometry)
        ON CONFLICT (${tableConfig.idField}) DO UPDATE SET geometry = EXCLUDED.geometry, simplified_geometry = EXCLUDED.simplified_geometry, properties = EXCLUDED.properties, updated_at = NOW()
        RETURNING (xmax = 0) AS inserted
      `))

    if (result.rows.length === 0) {
      return 'invalid'
    }

    return result.rows[0].inserted ? 'inserted' : 'updated'
  }
}

export const gpkgImportService = new GpkgImportService()
