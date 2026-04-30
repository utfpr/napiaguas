import { eq, inArray, sql } from 'drizzle-orm'
import type { NodePgDatabase, NodePgTransaction } from 'drizzle-orm/node-postgres'

import {
  geometriesTransportes,
  indicatorData,
  indicatorsTransportes,
  type NewIndicatorData,
  type NewIndicatorTransporte,
} from '../schema'
import { transportesIndicatorIds, transportesGeometryIds } from './constants'

type DatabaseClient = NodePgDatabase | NodePgTransaction<any, any>

const transportesIndicators: NewIndicatorTransporte[] = [
  {
    id: transportesIndicatorIds.indiceVulnerabilidadeTransporte,
    workgroupId: 'transportes',
    parentId: null,
    name: 'Índice de Vulnerabilidade do Transporte Rodoviário',
    description:
      'Composição agregada dos riscos de infraestrutura de transporte rodoviário no Paraná',
    level: 'index',
    order: 1,
    metadata: { domain: 'transportes' },
  },
  {
    id: transportesIndicatorIds.subindiceExposicaoRodovias,
    workgroupId: 'transportes',
    parentId: transportesIndicatorIds.indiceVulnerabilidadeTransporte,
    name: 'Subíndice: Exposição de Rodovias',
    description: 'Exposição das rodovias a ameaças climáticas (inundação, deslizamento)',
    level: 'subindex',
    order: 1,
  },
  {
    id: transportesIndicatorIds.indicadorAreasInundacao,
    workgroupId: 'transportes',
    parentId: transportesIndicatorIds.subindiceExposicaoRodovias,
    name: 'Rodovias em Áreas de Inundação',
    description: 'Proporção de extensão das rodovias em zonas suscetíveis a alagamentos',
    unit: '%',
    level: 'indicator',
    order: 1,
  },
  {
    id: transportesIndicatorIds.indicadorAreasDeslizamento,
    workgroupId: 'transportes',
    parentId: transportesIndicatorIds.subindiceExposicaoRodovias,
    name: 'Rodovias em Áreas de Deslizamento',
    description: 'Trechos críticos em encostas com histórico de escorregamentos',
    unit: '%',
    level: 'indicator',
    order: 2,
  },
  {
    id: transportesIndicatorIds.subindiceVulnerabilidadeEstrutural,
    workgroupId: 'transportes',
    parentId: transportesIndicatorIds.indiceVulnerabilidadeTransporte,
    name: 'Subíndice: Vulnerabilidade Estrutural',
    description: 'Integridade física da malha rodoviária e de obras especiais',
    level: 'subindex',
    order: 2,
  },
  {
    id: transportesIndicatorIds.indicadorPavimentoDegradado,
    workgroupId: 'transportes',
    parentId: transportesIndicatorIds.subindiceVulnerabilidadeEstrutural,
    name: 'Pavimento Degradado',
    description: 'Índice médio de degradação do pavimento em cada segmento',
    unit: 'índice',
    level: 'indicator',
    order: 1,
  },
  {
    id: transportesIndicatorIds.indicadorPontesRisco,
    workgroupId: 'transportes',
    parentId: transportesIndicatorIds.subindiceVulnerabilidadeEstrutural,
    name: 'Pontes em Risco',
    description: 'Percentual de pontes/viadutos com risco estrutural elevado',
    unit: '%',
    level: 'indicator',
    order: 2,
  },
]

const roadSegments = [
  {
    id: transportesGeometryIds.br277,
    name: 'BR-277 — Curitiba até Paranaguá',
    code: 'BR-277',
    roadType: 'federal' as const,
    geojson: {
      type: 'LineString',
      coordinates: [
        [-49.2731, -25.4284],
        [-49.112, -25.45],
        [-48.85, -25.52],
        [-48.505, -25.52],
      ],
    },
    metadata: {
      source: 'Mock GT Transportes',
      lanes: 4,
      notes: 'Trecho costeiro com histórico de alagamentos',
    },
  },
  {
    id: transportesGeometryIds.br376,
    name: 'BR-376 — Curitiba até Ponta Grossa',
    code: 'BR-376',
    roadType: 'federal' as const,
    geojson: {
      type: 'LineString',
      coordinates: [
        [-49.2731, -25.4284],
        [-49.35, -25.3],
        [-49.6, -25.2],
        [-49.73, -25.09],
      ],
    },
    metadata: {
      source: 'Mock GT Transportes',
      lanes: 4,
      notes: 'Ligação metropolitana com tráfego intenso',
    },
  },
  {
    id: transportesGeometryIds.pr508,
    name: 'PR-508 — Litoral Paranaense',
    code: 'PR-508',
    roadType: 'estadual' as const,
    geojson: {
      type: 'LineString',
      coordinates: [
        [-48.62, -25.54],
        [-48.57, -25.49],
        [-48.52, -25.45],
        [-48.48, -25.38],
      ],
    },
    metadata: {
      source: 'Mock GT Transportes',
      lanes: 2,
      notes: 'Trecho litorâneo com taludes suscetíveis a deslizamento',
    },
  },
  {
    id: transportesGeometryIds.pr090,
    name: 'PR-090 — Guarapuava até Ponta Grossa',
    code: 'PR-090',
    roadType: 'estadual' as const,
    geojson: {
      type: 'LineString',
      coordinates: [
        [-51.46, -25.39],
        [-51.05, -25.2],
        [-50.63, -24.95],
        [-50.16, -24.9],
      ],
    },
    metadata: {
      source: 'Mock GT Transportes',
      lanes: 2,
      notes: 'Trecho interior com necessidade de manutenção constante',
    },
  },
] as const

const transportesIndicatorData: NewIndicatorData[] = [
  {
    geometryId: transportesGeometryIds.br277,
    indicatorId: transportesIndicatorIds.indicadorAreasInundacao,
    value: '0.82',
    normalizedValue: '0.82',
    metadata: { risk: 'alto' },
  },
  {
    geometryId: transportesGeometryIds.pr508,
    indicatorId: transportesIndicatorIds.indicadorAreasInundacao,
    value: '0.68',
    normalizedValue: '0.68',
    metadata: { risk: 'alto', context: 'rodovia costeira' },
  },
  {
    geometryId: transportesGeometryIds.pr508,
    indicatorId: transportesIndicatorIds.indicadorAreasDeslizamento,
    value: '0.91',
    normalizedValue: '0.91',
    metadata: { risk: 'muito-alto' },
  },
  {
    geometryId: transportesGeometryIds.pr090,
    indicatorId: transportesIndicatorIds.indicadorAreasDeslizamento,
    value: '0.55',
    normalizedValue: '0.55',
    metadata: { risk: 'moderado' },
  },
  {
    geometryId: transportesGeometryIds.br376,
    indicatorId: transportesIndicatorIds.indicadorPavimentoDegradado,
    value: '0.35',
    normalizedValue: '0.35',
    metadata: { status: 'regular' },
  },
  {
    geometryId: transportesGeometryIds.pr090,
    indicatorId: transportesIndicatorIds.indicadorPavimentoDegradado,
    value: '0.62',
    normalizedValue: '0.62',
    metadata: { status: 'atenção' },
  },
  {
    geometryId: transportesGeometryIds.br277,
    indicatorId: transportesIndicatorIds.indicadorPontesRisco,
    value: '0.48',
    normalizedValue: '0.48',
    metadata: { bridges_inspected: 12, bridges_at_risk: 6 },
  },
  {
    geometryId: transportesGeometryIds.br376,
    indicatorId: transportesIndicatorIds.indicadorPontesRisco,
    value: '0.27',
    normalizedValue: '0.27',
    metadata: { bridges_inspected: 9, bridges_at_risk: 2 },
  },
]

export async function seedTransportes(db: DatabaseClient) {
  // Garantir workgroup transportes
  await db.execute(sql`
    INSERT INTO workgroups (id, name, description, icon, color, geometry_type)
    VALUES (
      'transportes',
      'GT Infraestrutura de Transportes',
      'Infraestrutura e logística em sistemas aquáticos',
      'truck',
      '#f97316',
      'linestring'
    )
    ON CONFLICT (id) DO NOTHING;
  `)

  const transportIndicatorIds = Object.values(transportesIndicatorIds)

  if (transportIndicatorIds.length > 0) {
    await db
      .delete(indicatorData)
      .where(inArray(indicatorData.indicatorId, transportIndicatorIds))
  }

  await db
    .delete(indicatorsTransportes)
    .where(eq(indicatorsTransportes.workgroupId, 'transportes'))

  await db
    .delete(geometriesTransportes)
    .where(eq(geometriesTransportes.workgroupId, 'transportes'))

  await db
    .insert(indicatorsTransportes)
    .values(transportesIndicators)
    .onConflictDoNothing()

  for (const segment of roadSegments) {
    await db.execute(sql`
      INSERT INTO geometries_transportes (id, workgroup_id, name, code, road_type, geometry, metadata)
      VALUES (
        ${segment.id},
        'transportes',
        ${segment.name},
        ${segment.code},
        ${segment.roadType},
        ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(segment.geojson)}), 4326),
        ${JSON.stringify(segment.metadata)}
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        code = EXCLUDED.code,
        road_type = EXCLUDED.road_type,
        geometry = EXCLUDED.geometry,
        metadata = EXCLUDED.metadata,
        updated_at = NOW();
    `)
  }

  if (transportesIndicatorData.length > 0) {
    await db.insert(indicatorData).values(transportesIndicatorData)
  }
}
