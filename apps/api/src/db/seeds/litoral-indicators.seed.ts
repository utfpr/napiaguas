import type { NodePgDatabase, NodePgTransaction } from 'drizzle-orm/node-postgres'
import { eq } from 'drizzle-orm'

import { indicatorHierarchy, workgroups } from '../schema'

type DatabaseClient = NodePgDatabase | NodePgTransaction<any, any>

// Cria a hierarquia do GT Litoral: 1 índice (IVC) + 7 indicadores-folha.
export async function seedLitoralIndicators(db: DatabaseClient) {
  console.log('Seeding GT Litoral indicators...')

  const workgroup = await (db as any).query.workgroups.findFirst({
    where: eq(workgroups.id, 'litoral'),
  })

  if (!workgroup) {
    throw new Error('Workgroup litoral não existe. Execute seedWorkgroups() primeiro.')
  }

  const result = await db
    .insert(indicatorHierarchy)
    .values({
      workgroupId: 'litoral',
      code: 'IVC',
      name: 'Índice de Vulnerabilidade Costeira',
      type: 'indice',
      parentId: null,
      order: 0,
      description: 'Índice de Vulnerabilidade Costeira dos 7 municípios litorâneos do Paraná',
    })
    .onConflictDoNothing()
    .returning()
  const [indiceIVC] = result as any[]

  if (!indiceIVC) {
    console.log('  Índice IVC já existe, pulando seed')
    return
  }

  console.log('  Índice IVC criado')

  await db
    .insert(indicatorHierarchy)
    .values([
      {
        workgroupId: 'litoral',
        code: 'Dens_pop',
        name: 'Densidade Populacional',
        type: 'indicador',
        parentId: indiceIVC.id,
        order: 1,
        unit: 'índice normalizado',
        description:
          'Indicador agregado de densidade populacional e estrutura etária dos municípios litorâneos',
      },
      {
        workgroupId: 'litoral',
        code: 'Socioeconomico',
        name: 'Nível Socioeconômico',
        type: 'indicador',
        parentId: indiceIVC.id,
        order: 2,
        unit: 'índice normalizado',
        description:
          'Indicador agregado de renda per capita e nível educacional dos municípios litorâneos',
      },
      {
        workgroupId: 'litoral',
        code: 'Uso_solo',
        name: 'Uso do Solo',
        type: 'indicador',
        parentId: indiceIVC.id,
        order: 3,
        unit: 'índice normalizado',
        description: 'Indicador de uso e ocupação do solo nas áreas costeiras',
      },
      {
        workgroupId: 'litoral',
        code: 'Ondas',
        name: 'Exposição a Ondas',
        type: 'indicador',
        parentId: indiceIVC.id,
        order: 4,
        unit: 'índice normalizado',
        description: 'Indicador agregado de exposição a ondas, elevação do mar e relevo costeiro',
      },
      {
        workgroupId: 'litoral',
        code: 'Erosao_costeira',
        name: 'Erosão Costeira',
        type: 'indicador',
        parentId: indiceIVC.id,
        order: 5,
        unit: 'índice normalizado',
        description: 'Indicador agregado de erosão costeira, marés e geomorfologia litorânea',
      },
      {
        workgroupId: 'litoral',
        code: 'Deslizamentos',
        name: 'Deslizamentos',
        type: 'indicador',
        parentId: indiceIVC.id,
        order: 6,
        unit: 'índice normalizado',
        description:
          'Indicador agregado de risco de deslizamentos considerando precipitação, geotecnia e declividade',
      },
      {
        workgroupId: 'litoral',
        code: 'Inundacoes',
        name: 'Inundações',
        type: 'indicador',
        parentId: indiceIVC.id,
        order: 7,
        unit: 'índice normalizado',
        description: 'Indicador agregado de risco de inundações costeiras e alagamentos',
      },
    ])
    .onConflictDoNothing()

  console.log('  7 indicadores de Litoral criados')
  console.log('GT Litoral: 1 índice, 7 indicadores.')
}
