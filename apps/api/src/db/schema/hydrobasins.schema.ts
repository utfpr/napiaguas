import {
  geometry,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'

/**
 * Geometrias HydroBASINS nível 10 com suporte a versões simplificadas.
 * Utiliza SRID 4326 conforme especificação do GT Água Doce.
 */
export const hydrobasinsGeometries = pgTable(
  'hydrobasins_geometries',
  {
    hybasId: text('hybas_id').notNull().primaryKey(),
    geometry: geometry('geometry', { type: 'multipolygon', srid: 4326 }).notNull(),
    simplifiedGeometry: geometry('simplified_geometry', {
      type: 'multipolygon',
      srid: 4326,
    }),
    properties: jsonb('properties'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    geometryIdx: index('idx_hydrobasins_geometry').using('gist', table.geometry),
    simplifiedGeometryIdx: index('idx_hydrobasins_simplified_geometry').using(
      'gist',
      table.simplifiedGeometry,
    ),
  }),
)

export type HydrobasinGeometry = typeof hydrobasinsGeometries.$inferSelect
export type NewHydrobasinGeometry = typeof hydrobasinsGeometries.$inferInsert
