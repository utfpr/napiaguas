import {
  geometry,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'

/**
 * Geometrias dos 399 municípios do Paraná para o GT Saúde.
 * Utiliza SRID 4326 (WGS84) conforme especificação do projeto.
 */
export const municipalityGeometries = pgTable(
  'municipality_geometries',
  {
    codigo: text('codigo').notNull().primaryKey(), // Código IBGE (7 dígitos)
    municipio: text('municipio').notNull(),
    geometry: geometry('geometry', { type: 'multipolygon', srid: 4326 }).notNull(),
    simplifiedGeometry: geometry('simplified_geometry', {
      type: 'multipolygon',
      srid: 4326,
    }),
    properties: jsonb('properties'), // Ex: { population: 1948626, area_km2: 435.5 }
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    geometryIdx: index('idx_municipality_geometry').using('gist', table.geometry),
    simplifiedGeometryIdx: index('idx_municipality_simplified_geometry').using(
      'gist',
      table.simplifiedGeometry,
    ),
    municipioIdx: index('idx_municipality_municipio').on(table.municipio), // Para busca/autocomplete
  }),
)

export type MunicipalityGeometry = typeof municipalityGeometries.$inferSelect
export type NewMunicipalityGeometry = typeof municipalityGeometries.$inferInsert
