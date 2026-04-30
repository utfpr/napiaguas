import type { NodePgDatabase, NodePgTransaction } from 'drizzle-orm/node-postgres'

import { indicators } from '../schema'
import type { NewIndicator } from '../schema'

const indicatorsData: NewIndicator[] = [
  {
    id: 'idx-vuln-aquatica',
    workgroupId: 'agua-doce',
    parentId: null,
    name: 'Índice de Vulnerabilidade Aquática',
    description: 'Composição geral da vulnerabilidade de água doce',
    type: 'index',
    order: 1,
  },
  {
    id: 'subidx-exposicao',
    workgroupId: 'agua-doce',
    parentId: 'idx-vuln-aquatica',
    name: 'Subíndice de Exposição',
    description: 'Fatores de pressão externos',
    type: 'subindex',
    order: 1,
  },
  {
    id: 'subidx-sensibilidade',
    workgroupId: 'agua-doce',
    parentId: 'idx-vuln-aquatica',
    name: 'Subíndice de Sensibilidade',
    description: 'Sensibilidade intrínseca das subbacias',
    type: 'subindex',
    order: 2,
  },
  {
    id: 'ind-agricultura',
    workgroupId: 'agua-doce',
    parentId: 'subidx-exposicao',
    name: 'Intensidade da Agricultura',
    description: 'Proporção de área agrícola na subbacia',
    unit: 'mm/ano',
    type: 'indicator',
    order: 1,
  },
  {
    id: 'ind-urbanizacao',
    workgroupId: 'agua-doce',
    parentId: 'subidx-exposicao',
    name: 'Taxa de Urbanização',
    description: 'Percentual de área urbanizada em regiões de risco',
    unit: '%',
    type: 'indicator',
    order: 2,
  },
  {
    id: 'ind-biodiversidade',
    workgroupId: 'agua-doce',
    parentId: 'subidx-sensibilidade',
    name: 'Biodiversidade Aquática',
    description: 'Índice composto de biodiversidade',
    unit: 'índice',
    type: 'indicator',
    order: 1,
  },
  {
    id: 'ind-qualidade-agua',
    workgroupId: 'agua-doce',
    parentId: 'subidx-sensibilidade',
    name: 'Qualidade da Água',
    description: 'Média ponderada de indicadores físico-químicos',
    unit: 'mg/L',
    type: 'indicator',
    order: 2,
  },
]

type DatabaseClient = NodePgDatabase | NodePgTransaction<any, any>

export async function seedIndicators(db: DatabaseClient) {
  await db.insert(indicators).values(indicatorsData)
}
