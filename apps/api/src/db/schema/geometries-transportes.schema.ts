import {
  geometry,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

import { workgroups } from './workgroups.schema'

export const roadTypeEnum = pgEnum('road_type_enum', ['federal', 'estadual'])

/**
 * Geometria de trechos rodoviários do GT Transportes.
 * Usa LineString (SRID 4326) conforme critérios de aceitação.
 */
export const geometriesTransportes = pgTable('geometries_transportes', {
  id: uuid('id').defaultRandom().primaryKey(),
  workgroupId: varchar('workgroup_id', { length: 50 })
    .notNull()
    .references(() => workgroups.id),
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 50 }),
  roadType: roadTypeEnum('road_type').notNull(),
  geometry: geometry('geometry', { type: 'linestring', srid: 4326 }).notNull(),
  lengthKm: numeric('length_km', { precision: 10, scale: 2 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export type GeometryTransporte = typeof geometriesTransportes.$inferSelect
export type NewGeometryTransporte = typeof geometriesTransportes.$inferInsert
