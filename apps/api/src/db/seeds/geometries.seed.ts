import type { NodePgDatabase, NodePgTransaction } from 'drizzle-orm/node-postgres'
import { sql } from 'drizzle-orm'

const hydrobasinsData = [
  {
    hybasId: '6100014540',
    name: 'Sub-bacia Alto Iguaçu',
    geojson: {
      type: 'Polygon',
      coordinates: [
        [
          [-49.27, -25.43],
          [-49.20, -25.43],
          [-49.20, -25.50],
          [-49.27, -25.50],
          [-49.27, -25.43],
        ],
      ],
    },
    properties: {
      area_km2: 1200,
      codigo_ibge: '410690',
      level: 10,
      basin: 'Iguaçu',
    },
  },
  {
    hybasId: '6100014550',
    name: 'Sub-bacia Médio Iguaçu',
    geojson: {
      type: 'Polygon',
      coordinates: [
        [
          [-49.15, -25.38],
          [-49.05, -25.38],
          [-49.05, -25.47],
          [-49.15, -25.47],
          [-49.15, -25.38],
        ],
      ],
    },
    properties: {
      area_km2: 980,
      codigo_ibge: '410830',
      level: 10,
      basin: 'Iguaçu',
    },
  },
  {
    hybasId: '6100014560',
    name: 'Sub-bacia Baixo Iguaçu',
    geojson: {
      type: 'Polygon',
      coordinates: [
        [
          [-48.98, -25.42],
          [-48.88, -25.42],
          [-48.88, -25.52],
          [-48.98, -25.52],
          [-48.98, -25.42],
        ],
      ],
    },
    properties: {
      area_km2: 1105,
      codigo_ibge: '410940',
      level: 10,
      basin: 'Iguaçu',
    },
  },
  {
    hybasId: '6100014570',
    name: 'Sub-bacia APA Leste',
    geojson: {
      type: 'Polygon',
      coordinates: [
        [
          [-49.35, -25.30],
          [-49.25, -25.30],
          [-49.25, -25.40],
          [-49.35, -25.40],
          [-49.35, -25.30],
        ],
      ],
    },
    properties: {
      area_km2: 860,
      codigo_ibge: '411520',
      level: 10,
      basin: 'APA',
    },
  },
  {
    hybasId: '6100014580',
    name: 'Sub-bacia APA Sul',
    geojson: {
      type: 'Polygon',
      coordinates: [
        [
          [-49.22, -25.55],
          [-49.12, -25.55],
          [-49.12, -25.65],
          [-49.22, -25.65],
          [-49.22, -25.55],
        ],
      ],
    },
    properties: {
      area_km2: 745,
      codigo_ibge: '410180',
      level: 10,
      basin: 'APA',
    },
  },
  {
    hybasId: '6100014590',
    name: 'Sub-bacia APA Norte',
    geojson: {
      type: 'Polygon',
      coordinates: [
        [
          [-49.10, -25.25],
          [-49.00, -25.25],
          [-49.00, -25.35],
          [-49.10, -25.35],
          [-49.10, -25.25],
        ],
      ],
    },
    properties: {
      area_km2: 690,
      codigo_ibge: '410340',
      level: 10,
      basin: 'APA',
    },
  },
]

type DatabaseClient = NodePgDatabase | NodePgTransaction<any, any>

export async function seedGeometries(db: DatabaseClient) {
  for (const basin of hydrobasinsData) {
    await db.execute(sql`
      INSERT INTO hydrobasins_geometries (
        hybas_id,
        geometry,
        simplified_geometry,
        properties
      )
      VALUES (
        ${basin.hybasId},
        ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(basin.geojson)}), 4326),
        ST_SetSRID(
          ST_SimplifyPreserveTopology(
            ST_GeomFromGeoJSON(${JSON.stringify(basin.geojson)}),
            0.01
          ),
          4326
        ),
        ${JSON.stringify({
          name: basin.name,
          ...basin.properties,
        })}
      )
      ON CONFLICT (hybas_id) DO UPDATE
      SET
        geometry = EXCLUDED.geometry,
        simplified_geometry = EXCLUDED.simplified_geometry,
        properties = EXCLUDED.properties,
        updated_at = now()
    `)
  }
}
