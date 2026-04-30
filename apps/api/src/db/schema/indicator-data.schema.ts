import {
  jsonb,
  numeric,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

import { geometriesTransportes } from './geometries-transportes.schema'
import { indicatorsTransportes } from './indicators-transportes.schema'

export const indicatorData = pgTable(
  'indicator_data',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    geometryId: uuid('geometry_id')
      .notNull()
      .references(() => geometriesTransportes.id, { onDelete: 'cascade' }),
    indicatorId: uuid('indicator_id')
      .notNull()
      .references(() => indicatorsTransportes.id, { onDelete: 'cascade' }),
    value: numeric('value', { precision: 10, scale: 4 }).notNull(),
    normalizedValue: numeric('normalized_value', { precision: 5, scale: 4 }),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    geometryIndicatorUnique: uniqueIndex('indicator_data_geometry_indicator_unique').on(
      table.geometryId,
      table.indicatorId,
    ),
  }),
)

export type IndicatorData = typeof indicatorData.$inferSelect
export type NewIndicatorData = typeof indicatorData.$inferInsert
