import type { NodePgDatabase, NodePgTransaction } from 'drizzle-orm/node-postgres'

import { indicatorHierarchy } from '../schema'

type DatabaseClient = NodePgDatabase | NodePgTransaction<any, any>

// Cria a hierarquia de indicadores do GT Saúde.
// Estrutura: 1 índice (Exposição), 3 sub-índices (Doenças, Pobreza, Vulnerabilidade das Famílias)
// e 12 indicadores-folha. O sub-índice Vulnerabilidade das Famílias é usado diretamente.
export async function seedSaudeIndicators(db: DatabaseClient) {
  console.log('Seeding GT Saúde indicators...')

  const result = await db
    .insert(indicatorHierarchy)
    .values({
      workgroupId: 'saude',
      code: 'I_exposicao',
      name: 'Exposição',
      type: 'indice',
      parentId: null,
      order: 0,
      description: 'Índice de Exposição do GT Saúde Ambiental',
    })
    .onConflictDoNothing()
    .returning()
  const [indiceExposicao] = result as any[]

  if (!indiceExposicao) {
    console.log('  Índice I_exposicao já existe, pulando seed')
    return
  }

  console.log('  Índice I_exposicao criado')

  const result2 = await db
    .insert(indicatorHierarchy)
    .values({
      workgroupId: 'saude',
      code: 'subIndice_doencas',
      name: 'Doenças',
      type: 'subindice',
      parentId: indiceExposicao.id,
      order: 1,
      description: 'Sub-índice de Doenças relacionadas à saúde ambiental',
    })
    .onConflictDoNothing()
    .returning()
  const [subDoencas] = result2 as any[]

  console.log('  Sub-índice Doenças criado')

  await db
    .insert(indicatorHierarchy)
    .values([
      {
        workgroupId: 'saude',
        code: 'PROP_ANP',
        name: 'Proporção de Acidentes com Animais Peçonhentos',
        type: 'indicador',
        parentId: subDoencas.id,
        order: 1,
        unit: 'proporção',
        description: 'Proporção de acidentes com animais peçonhentos por município',
      },
      {
        workgroupId: 'saude',
        code: 'PROP_DE',
        name: 'Proporção de Casos de Dengue',
        type: 'indicador',
        parentId: subDoencas.id,
        order: 2,
        unit: 'proporção',
        description: 'Proporção de casos de dengue por município',
      },
      {
        workgroupId: 'saude',
        code: 'PROP_MDSC',
        name: 'Proporção de casos de Doenças do Sistema Circulatório',
        type: 'indicador',
        parentId: subDoencas.id,
        order: 3,
        unit: 'proporção',
        description: 'Proporção de casos de doenças do sistema circulatório por município',
      },
      {
        workgroupId: 'saude',
        code: 'PROP_MDSR',
        name: 'Proporção de casos de Doenças do Sistema Respiratório',
        type: 'indicador',
        parentId: subDoencas.id,
        order: 4,
        unit: 'proporção',
        description: 'Proporção de casos de doenças do sistema respiratório por município',
      },
    ])
    .onConflictDoNothing()

  console.log('  4 indicadores de Doenças criados')

  const result3 = await db
    .insert(indicatorHierarchy)
    .values({
      workgroupId: 'saude',
      code: 'subIndice_pobreza',
      name: 'Pobreza',
      type: 'subindice',
      parentId: indiceExposicao.id,
      order: 2,
      description: 'Sub-índice de Pobreza e vulnerabilidade socioeconômica',
    })
    .onConflictDoNothing()
    .returning()
  const [subPobreza] = result3 as any[]

  console.log('  Sub-índice Pobreza criado')

  await db
    .insert(indicatorHierarchy)
    .values([
      {
        workgroupId: 'saude',
        code: 'IPDM_2022',
        name: 'Índice IPARDES de Desenvolvimento Municipal no ano 2022',
        type: 'indicador',
        parentId: subPobreza.id,
        order: 1,
        unit: 'índice',
        description: 'Índice IPARDES de Desenvolvimento Municipal para o ano de 2022',
      },
      {
        workgroupId: 'saude',
        code: 'PDSI_2022',
        name: 'Proporção de domicílios com saneamento inadequado para o ano de 2022',
        type: 'indicador',
        parentId: subPobreza.id,
        order: 2,
        unit: 'proporção',
        description: 'Proporção de domicílios com saneamento inadequado em 2022',
      },
      {
        workgroupId: 'saude',
        code: 'TM5_2023',
        name: 'Taxa de Mortalidade de menores de 5 anos no ano de 2023',
        type: 'indicador',
        parentId: subPobreza.id,
        order: 3,
        unit: 'taxa',
        description: 'Taxa de mortalidade de crianças menores de 5 anos em 2023',
      },
      {
        workgroupId: 'saude',
        code: 'PAN15_2022',
        name: 'Proporção de Analfabetismo até 15 anos em 2022',
        type: 'indicador',
        parentId: subPobreza.id,
        order: 4,
        unit: 'proporção',
        description: 'Proporção de analfabetismo entre crianças e adolescentes até 15 anos',
      },
      {
        workgroupId: 'saude',
        code: 'QPCUPB_2025',
        name: 'Quantidade de pessoas inscritas no CADÚNICO - pobreza - em Janeiro de 2025',
        type: 'indicador',
        parentId: subPobreza.id,
        order: 5,
        unit: 'quantidade',
        description: 'Quantidade de pessoas em situação de pobreza cadastradas no CADÚNICO',
      },
      {
        workgroupId: 'saude',
        code: 'QPCURB_2025',
        name: 'Quantidade de pessoas inscritas no CADÚNICO - pobreza + baixa renda - em Janeiro de 2025',
        type: 'indicador',
        parentId: subPobreza.id,
        order: 6,
        unit: 'quantidade',
        description: 'Quantidade de pessoas em situação de pobreza e baixa renda no CADÚNICO',
      },
      {
        workgroupId: 'saude',
        code: 'QPCUMS_2025',
        name:
          'Quantidade de pessoas inscritas no CADÚNICO - renda per capita mensal > meio salário mínimo - em Janeiro de 2025',
        type: 'indicador',
        parentId: subPobreza.id,
        order: 7,
        unit: 'quantidade',
        description:
          'Quantidade de pessoas no CADÚNICO com renda per capita acima de meio salário mínimo',
      },
      {
        workgroupId: 'saude',
        code: 'QFINCU_2025',
        name:
          'Quantidade de pessoas inscritas no CADÚNICO - total de famílias - em Janeiro de 2025',
        type: 'indicador',
        parentId: subPobreza.id,
        order: 8,
        unit: 'quantidade',
        description: 'Quantidade total de famílias cadastradas no CADÚNICO',
      },
    ])
    .onConflictDoNothing()

  console.log('  8 indicadores de Pobreza criados')

  // Sub-índice sem indicadores-folha: o valor próprio é usado diretamente.
  await db
    .insert(indicatorHierarchy)
    .values({
      workgroupId: 'saude',
      code: 'subIndice_vulnerabilidade',
      name: 'Vulnerabilidade das Famílias',
      type: 'subindice',
      parentId: indiceExposicao.id,
      order: 3,
      description:
        'Sub-índice de Vulnerabilidade das Famílias (valor usado diretamente, sem indicadores filhos)',
    })
    .onConflictDoNothing()

  console.log('  Sub-índice Vulnerabilidade das Famílias criado')
  console.log('GT Saúde: 1 índice, 3 sub-índices, 12 indicadores.')
}
