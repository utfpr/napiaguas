import {
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

import { indicatorHierarchy } from './indicator-hierarchy.schema'

/**
 * Tabela de agregações pré-calculadas por comitê de bacia.
 * Armazena médias, mínimos, máximos e contagens de indicadores
 * agrupados por comitê para consulta instantânea.
 */
export const comiteAggregations = pgTable(
  'comite_aggregations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    comiteNome: text('comite_nome').notNull(),
    indicatorId: uuid('indicator_id')
      .notNull()
      .references(() => indicatorHierarchy.id, { onDelete: 'cascade' }),
    meanValue: numeric('mean_value', { precision: 10, scale: 4 }).notNull(),
    count: integer('count').notNull(),
    minValue: numeric('min_value', { precision: 10, scale: 4 }).notNull(),
    maxValue: numeric('max_value', { precision: 10, scale: 4 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    comiteIndicatorUnique: uniqueIndex('comite_aggregations_comite_indicator_unique').on(
      table.comiteNome,
      table.indicatorId,
    ),
    comiteIdx: index('idx_comite_aggregations_comite').on(table.comiteNome),
    indicatorIdx: index('idx_comite_aggregations_indicator').on(table.indicatorId),
  }),
)

export type ComiteAggregation = typeof comiteAggregations.$inferSelect
export type NewComiteAggregation = typeof comiteAggregations.$inferInsert
