import { boolean, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

import { workgroups } from './workgroups.schema'

export const geometriesAguaDoce = pgTable('geometries_agua_doce', {
  id: text('id').primaryKey(),
  workgroupId: text('workgroup_id')
    .notNull()
    .references(() => workgroups.id),
  name: text('name').notNull(),
  // Placeholder column replaced via raw SQL in migration to proper geometry type
  geometry: text('geometry').notNull(),
  properties: text('properties'),
  simplified: boolean('simplified').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export type GeometryAguaDoce = typeof geometriesAguaDoce.$inferSelect
export type NewGeometryAguaDoce = typeof geometriesAguaDoce.$inferInsert
