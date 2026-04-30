import type { NodePgDatabase, NodePgTransaction } from 'drizzle-orm/node-postgres'

import { workgroups } from '../schema'
import type { NewWorkgroup } from '../schema'

const workgroupsData: NewWorkgroup[] = [
  {
    id: 'agua-doce',
    name: 'GT Ecossistemas de Água Doce',
    description: 'Vulnerabilidade de subbacias e ecossistemas aquáticos',
    icon: 'water-drop',
    color: '#0ea5e9',
    geometryType: 'polygon',
    active: true,
  },
  {
    id: 'litoral',
    name: 'GT Zona Costeira e Litoral',
    description: 'Erosão costeira e recursos marinhos',
    icon: 'waves',
    color: '#06b6d4',
    geometryType: 'polygon',
    active: true,
  },
  {
    id: 'saude',
    name: 'GT Saúde Ambiental',
    description: 'Indicadores de saúde relacionados à água e saneamento',
    icon: 'health',
    color: '#22c55e',
    geometryType: 'polygon',
    active: true,
  },
  {
    id: 'transportes',
    name: 'GT Infraestrutura de Transportes',
    description: 'Infraestrutura e logística em sistemas aquáticos',
    icon: 'truck',
    color: '#f97316',
    geometryType: 'linestring',
    active: true,
  },
]

type DatabaseClient = NodePgDatabase | NodePgTransaction<any, any>

export async function seedWorkgroups(db: DatabaseClient) {
  await db.insert(workgroups).values(workgroupsData).onConflictDoNothing()
}
