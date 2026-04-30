import {
  check,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

import { indicatorHierarchy } from './indicator-hierarchy.schema'
import { municipalityGeometries } from './municipality.schema'

/**
 * Valores de indicadores de litoral para os 7 municípios litorâneos do Paraná.
 * Relaciona indicadores do GT Litoral com municípios através de código IBGE.
 *
 * Municípios litorâneos:
 * - Antonina (4101200)
 * - Guaraqueçaba (4109500)
 * - Guaratuba (4109609)
 * - Matinhos (4115705)
 * - Morretes (4116208)
 * - Paranaguá (4118204)
 * - Pontal do Paraná (4119954)
 *
 * Estrutura de dados:
 * - 1 índice (Índice de Vulnerabilidade Costeira - IVC)
 * - 7 indicadores tipo folha:
 *   - Densidade Populacional
 *   - Nível Socioeconômico
 *   - Uso do Solo
 *   - Exposição a Ondas
 *   - Erosão Costeira
 *   - Deslizamentos
 *   - Inundações
 *
 * Total esperado: 49 registros (7 municípios × 7 indicadores)
 */
export const coastalIndicatorValues = pgTable(
  'coastal_indicator_values',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    indicatorId: uuid('indicator_id')
      .notNull()
      .references(() => indicatorHierarchy.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    codigoMunicipio: text('codigo_municipio')
      .notNull()
      .references(() => municipalityGeometries.codigo, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    value: numeric('value', { precision: 14, scale: 6 }).notNull(),
    normalizedValue: numeric('normalized_value', { precision: 6, scale: 4 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    // Índice composto para queries de (indicador + município)
    // Otimiza joins com indicator_hierarchy e municipality_geometries
    indicatorMunicipioIdx: index('idx_coastal_indicator_municipio').on(
      table.indicatorId,
      table.codigoMunicipio,
    ),
    // Constraint UNIQUE para garantir um valor único por (indicador, município)
    uniqueIndicatorMunicipio: uniqueIndex('uq_coastal_indicator_municipio').on(
      table.indicatorId,
      table.codigoMunicipio,
    ),
    // Constraint CHECK para validar que normalized_value está entre 0 e 1
    // normalized_value é opcional (NULL) mas quando presente deve estar no range 0-1
    normalizedRange: check(
      'coastal_indicator_values_normalized_value_range',
      sql`
        ${table.normalizedValue} IS NULL OR
        (${table.normalizedValue} >= 0 AND ${table.normalizedValue} <= 1)
      `,
    ),
  }),
)

export type CoastalIndicatorValue = typeof coastalIndicatorValues.$inferSelect
export type NewCoastalIndicatorValue = typeof coastalIndicatorValues.$inferInsert
