import {
  check,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

import { hydrobasinsGeometries } from './hydrobasins.schema'
import { indicatorHierarchy } from './indicator-hierarchy.schema'

export const indicatorValues = pgTable('indicator_values', {
  id: uuid('id').defaultRandom().primaryKey(),
  indicatorId: uuid('indicator_id')
    .notNull()
    .references(() => indicatorHierarchy.id, {
      onDelete: 'cascade',
      onUpdate: 'cascade',
    }),
  hybasId: text('hybas_id')
    .notNull()
    .references(() => hydrobasinsGeometries.hybasId, {
      onDelete: 'cascade',
      onUpdate: 'cascade',
    }),
  value: numeric('value', { precision: 14, scale: 6 }).notNull(),
  normalizedValue: numeric('normalized_value', { precision: 6, scale: 4 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  indicatorHybasUnique: uniqueIndex('indicator_values_indicator_hybas_unique').on(
    table.indicatorId,
    table.hybasId,
  ),
  normalizedRange: check(
    'indicator_values_normalized_value_range',
    sql`
      ${table.normalizedValue} IS NULL OR
      (${table.normalizedValue} >= 0 AND ${table.normalizedValue} <= 1)
    `,
  ),
}))

export type IndicatorValue = typeof indicatorValues.$inferSelect
export type NewIndicatorValue = typeof indicatorValues.$inferInsert
