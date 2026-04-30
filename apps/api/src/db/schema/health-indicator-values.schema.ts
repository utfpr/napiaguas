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
 * Valores de indicadores de saúde para os 399 municípios do Paraná.
 * Relaciona indicadores do GT Saúde com municípios através de código IBGE.
 */
export const healthIndicatorValues = pgTable(
  'health_indicator_values',
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
    indicatorMunicipioIdx: index('idx_health_indicator_municipio').on(
      table.indicatorId,
      table.codigoMunicipio,
    ),
    // Constraint UNIQUE para garantir um valor único por (indicador, município)
    uniqueIndicatorMunicipio: uniqueIndex('uq_health_indicator_municipio').on(
      table.indicatorId,
      table.codigoMunicipio,
    ),
    // Constraint CHECK para validar que normalized_value está entre 0 e 1
    normalizedRange: check(
      'health_indicator_values_normalized_value_range',
      sql`
        ${table.normalizedValue} IS NULL OR
        (${table.normalizedValue} >= 0 AND ${table.normalizedValue} <= 1)
      `,
    ),
  }),
)

export type HealthIndicatorValue = typeof healthIndicatorValues.$inferSelect
export type NewHealthIndicatorValue = typeof healthIndicatorValues.$inferInsert
