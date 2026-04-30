import { eq } from 'drizzle-orm'

import { indicatorsTransportes } from '../schema'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DatabaseClient = any

const WORKGROUP_ID = 'transportes'

export async function seedTransportesHierarchy(db: DatabaseClient) {
  console.log('Iniciando seed de hierarquia de indicadores para GT Transportes...')

  try {
    // Limpar hierarquia antiga de transportes
    await db
      .delete(indicatorsTransportes)
      .where(eq(indicatorsTransportes.workgroupId, WORKGROUP_ID))

    console.log('Hierarquia antiga removida')

    // NÍVEL 1: Índice Principal
    const [ivtrIndex] = await db
      .insert(indicatorsTransportes)
      .values({
        workgroupId: WORKGROUP_ID,
        name: 'Índice de Vulnerabilidade do Transporte Rodoviário',
        description:
          'Composição agregada dos riscos de infraestrutura de transporte rodoviário no Paraná',
        level: 'index',
        order: 1,
        parentId: null,
      })
      .returning()

    console.log('Nível 1: Índice IVTR criado')

    // NÍVEL 2: Subíndices

    // 2.1 - IVECDT
    const [ivecdtSubindex] = await db
      .insert(indicatorsTransportes)
      .values({
        workgroupId: WORKGROUP_ID,
        name: 'Índice de Vulnerabilidade de Exposição Climática para deslizamentos de terra',
        description: 'Exposição das rodovias a eventos climáticos que causam deslizamentos',
        level: 'subindex',
        order: 1,
        parentId: ivtrIndex.id,
      })
      .returning()

    // 2.2 - IVECI
    const [iveciSubindex] = await db
      .insert(indicatorsTransportes)
      .values({
        workgroupId: WORKGROUP_ID,
        name: 'Índice de Vulnerabilidade de Exposição Climática de inundação',
        description: 'Exposição das rodovias a eventos climáticos que causam inundações',
        level: 'subindex',
        order: 2,
        parentId: ivtrIndex.id,
      })
      .returning()

    // 2.3 - IVSADT
    const [ivsadtSubindex] = await db
      .insert(indicatorsTransportes)
      .values({
        workgroupId: WORKGROUP_ID,
        name: 'Índice de Vulnerabilidade de Sensibilidade do ambiente para deslizamento de terra',
        description:
          'Sensibilidade ambiental das áreas onde as rodovias estão localizadas em relação a deslizamentos',
        level: 'subindex',
        order: 3,
        parentId: ivtrIndex.id,
      })
      .returning()

    // 2.4 - IVSAI
    const [ivsaiSubindex] = await db
      .insert(indicatorsTransportes)
      .values({
        workgroupId: WORKGROUP_ID,
        name: 'Índice de Vulnerabilidade de Sensibilidade do ambiente para inundação',
        description:
          'Sensibilidade ambiental das áreas onde as rodovias estão localizadas em relação a inundações',
        level: 'subindex',
        order: 4,
        parentId: ivtrIndex.id,
      })
      .returning()

    // 2.5 - ICASV
    const [icasvSubindex] = await db
      .insert(indicatorsTransportes)
      .values({
        workgroupId: WORKGROUP_ID,
        name: 'Índice de Capacidade de adaptação socioeconômica frente às vulnerabilidades',
        description:
          'Capacidade da infraestrutura e população local de se adaptar aos impactos climáticos',
        level: 'subindex',
        order: 5,
        parentId: ivtrIndex.id,
      })
      .returning()

    console.log('Nível 2: 5 Subíndices criados')

    // NÍVEL 3 e 4: Indicadores e Variáveis

    // 3.1 - IVECDT → Indicadores
    const [r50mmIndicator] = await db
      .insert(indicatorsTransportes)
      .values({
        workgroupId: WORKGROUP_ID,
        name: 'Número de dias com chuva ≥ 50mm',
        description: 'Frequência de eventos de chuva intensa (≥50mm) que podem causar deslizamentos',
        level: 'indicator',
        unit: 'dias',
        order: 1,
        parentId: ivecdtSubindex.id,
      })
      .returning()

    const [rx5DayIndicator] = await db
      .insert(indicatorsTransportes)
      .values({
        workgroupId: WORKGROUP_ID,
        name: 'Chuva máxima acumulada em cinco dias',
        description: 'Volume máximo de precipitação acumulada em 5 dias consecutivos',
        level: 'indicator',
        unit: 'mm',
        order: 2,
        parentId: ivecdtSubindex.id,
      })
      .returning()

    const [cwdDeslizIndicator] = await db
      .insert(indicatorsTransportes)
      .values({
        workgroupId: WORKGROUP_ID,
        name: 'Número máximo de dias consecutivos com chuva (Deslizamento)',
        description: 'Período mais longo de chuvas consecutivas relacionado a deslizamentos',
        level: 'indicator',
        unit: 'dias',
        order: 3,
        parentId: ivecdtSubindex.id,
      })
      .returning()

    const [rMediaAnualIndicator] = await db
      .insert(indicatorsTransportes)
      .values({
        workgroupId: WORKGROUP_ID,
        name: 'Precipitação média anual',
        description: 'Média de precipitação anual na região',
        level: 'indicator',
        unit: 'mm',
        order: 4,
        parentId: ivecdtSubindex.id,
      })
      .returning()

    // 3.2 - IVECI → Indicadores
    const [r20mmIndicator] = await db
      .insert(indicatorsTransportes)
      .values({
        workgroupId: WORKGROUP_ID,
        name: 'Número de dias com chuva ≥ 20mm',
        description: 'Frequência de eventos de chuva moderada a forte (≥20mm) que podem causar inundações',
        level: 'indicator',
        unit: 'dias',
        order: 1,
        parentId: iveciSubindex.id,
      })
      .returning()

    const [rx1DayIndicator] = await db
      .insert(indicatorsTransportes)
      .values({
        workgroupId: WORKGROUP_ID,
        name: 'Chuva máxima acumulada em um dia',
        description: 'Volume máximo de precipitação em um único dia',
        level: 'indicator',
        unit: 'mm',
        order: 2,
        parentId: iveciSubindex.id,
      })
      .returning()

    const [cwdInundIndicator] = await db
      .insert(indicatorsTransportes)
      .values({
        workgroupId: WORKGROUP_ID,
        name: 'Número máximo de dias consecutivos com chuva (Inundação)',
        description: 'Período mais longo de chuvas consecutivas relacionado a inundações',
        level: 'indicator',
        unit: 'dias',
        order: 3,
        parentId: iveciSubindex.id,
      })
      .returning()

    // 3.3 - IVSADT → Indicadores

    // Grau_declv (COM 1 variável de nível 4: Declividade)
    const [grauDeclivDeslizIndicator] = await db
      .insert(indicatorsTransportes)
      .values({
        workgroupId: WORKGROUP_ID,
        name: 'Grau de declividade (Deslizamento)',
        description: 'Inclinação do terreno nas áreas de rodovias, fator crítico para deslizamentos',
        level: 'indicator',
        unit: 'graus',
        order: 1,
        parentId: ivsadtSubindex.id,
      })
      .returning()

    // Variável de nível 4: Declividade
    await db.insert(indicatorsTransportes).values({
      workgroupId: WORKGROUP_ID,
      name: 'Declividade',
      description: 'Valor numérico da declividade do terreno',
      level: 'indicator',
      unit: 'graus',
      order: 1,
      parentId: grauDeclivDeslizIndicator.id,
    })

    // Nota_solo (Coluna Nota_solo no CSV → 7 variáveis de USO DO SOLO)
    const [notaSoloIndicator] = await db
      .insert(indicatorsTransportes)
      .values({
        workgroupId: WORKGROUP_ID,
        name: 'Uso do solo',
        description: 'Classificação do uso do solo que afeta deslizamentos',
        level: 'indicator',
        unit: 'índice',
        order: 2,
        parentId: ivsadtSubindex.id,
      })
      .returning()

    // Variáveis de nível 4: USO DO SOLO (filhos de Nota_solo)
    const landUseVariables = [
      { name: 'Vegetação florestal', order: 1 },
      { name: 'Vegetação campestre úmida', order: 2 },
      { name: 'Silvicultura', order: 3 },
      { name: 'Área descoberta', order: 4 },
      { name: 'Pastagem', order: 5 },
      { name: 'Área agrícola', order: 6 },
      { name: 'Área artificial', order: 7 },
    ]

    for (const variable of landUseVariables) {
      await db.insert(indicatorsTransportes).values({
        workgroupId: WORKGROUP_ID,
        name: variable.name,
        description: `Proporção de ${variable.name.toLowerCase()} na área`,
        level: 'indicator',
        unit: '%',
        order: variable.order,
        parentId: notaSoloIndicator.id,
      })
    }

    // Nota_Uso (Coluna Nota_Uso no CSV → 11 variáveis de TIPOS DE SOLO - COMPARTILHADO com IVSAI)
    const [notaUsoIndicator] = await db
      .insert(indicatorsTransportes)
      .values({
        workgroupId: WORKGROUP_ID,
        name: 'Tipo de solo',
        description: 'Classificação do tipo de solo',
        level: 'indicator',
        unit: 'índice',
        order: 3,
        parentId: ivsadtSubindex.id,
      })
      .returning()

    // Variáveis de nível 4: TIPOS DE SOLO (filhos de Nota_Uso)
    const soilTypes = [
      { name: 'Neossolo', order: 1 },
      { name: 'Latossolo', order: 2 },
      { name: 'Solo sem nome', order: 3 },
      { name: 'Nitossolo', order: 4 },
      { name: 'Argissolo', order: 5 },
      { name: 'Gleissolo', order: 6 },
      { name: 'Organossolo', order: 7 },
      { name: 'Cambissolo', order: 8 },
      { name: 'Espodossolo', order: 9 },
      { name: 'Afloramento de rocha', order: 10 },
      { name: 'Chernossolo', order: 11 },
    ]

    for (const soilType of soilTypes) {
      await db.insert(indicatorsTransportes).values({
        workgroupId: WORKGROUP_ID,
        name: soilType.name,
        description: `Proporção de ${soilType.name.toLowerCase()} na área`,
        level: 'indicator',
        unit: '%',
        order: soilType.order,
        parentId: notaUsoIndicator.id,
      })
    }

    // 3.4 - IVSAI → Indicadores

    // Grau_declv (COM 1 variável de nível 4: Declividade)
    const [grauDeclivInundIndicator] = await db
      .insert(indicatorsTransportes)
      .values({
        workgroupId: WORKGROUP_ID,
        name: 'Grau de declividade (Inundação)',
        description: 'Inclinação do terreno nas áreas de rodovias, fator para inundações',
        level: 'indicator',
        unit: 'graus',
        order: 1,
        parentId: ivsaiSubindex.id,
      })
      .returning()

    // Variável de nível 4: Declividade
    await db.insert(indicatorsTransportes).values({
      workgroupId: WORKGROUP_ID,
      name: 'Declividade',
      description: 'Valor numérico da declividade do terreno',
      level: 'indicator',
      unit: 'graus',
      order: 1,
      parentId: grauDeclivInundIndicator.id,
    })

    // Densidade de estradas
    await db.insert(indicatorsTransportes).values({
      workgroupId: WORKGROUP_ID,
      name: 'Densidade de estradas',
      description: 'Densidade da malha rodoviária na região',
      level: 'indicator',
      unit: 'km/km²',
      order: 2,
      parentId: ivsaiSubindex.id,
    })

    // Nota_Uso (Coluna Nota_Uso no CSV → COMPARTILHADO com IVSADT - mesmas 11 variáveis de TIPOS DE SOLO)
    const [notaUsoIvsaiIndicator] = await db
      .insert(indicatorsTransportes)
      .values({
        workgroupId: WORKGROUP_ID,
        name: 'Tipo de solo',
        description: 'Classificação do tipo de solo',
        level: 'indicator',
        unit: 'índice',
        order: 3,
        parentId: ivsaiSubindex.id,
      })
      .returning()

    // Variáveis de nível 4: TIPOS DE SOLO (compartilhados com IVSADT)
    for (const soilType of soilTypes) {
      await db.insert(indicatorsTransportes).values({
        workgroupId: WORKGROUP_ID,
        name: soilType.name,
        description: `Proporção de ${soilType.name.toLowerCase()} na área`,
        level: 'indicator',
        unit: '%',
        order: soilType.order,
        parentId: notaUsoIvsaiIndicator.id,
      })
    }

    // 3.5 - ICASV → Indicadores
    const [vdmMediaIndicator] = await db
      .insert(indicatorsTransportes)
      .values({
        workgroupId: WORKGROUP_ID,
        name: 'Volume médio diário de tráfego',
        description: 'Média de veículos que trafegam diariamente nas rodovias',
        level: 'indicator',
        unit: 'veículos/dia',
        order: 1,
        parentId: icasvSubindex.id,
      })
      .returning()

    // Variáveis de nível 4: VMDa (Volume Médio Diário)
    await db.insert(indicatorsTransportes).values({
      workgroupId: WORKGROUP_ID,
      name: 'Volume Médio Diário - Carros',
      description: 'Volume médio diário de automóveis',
      level: 'indicator',
      unit: 'veículos/dia',
      order: 1,
      parentId: vdmMediaIndicator.id,
    })

    await db.insert(indicatorsTransportes).values({
      workgroupId: WORKGROUP_ID,
      name: 'Volume Médio Diário - Caminhões',
      description: 'Volume médio diário de veículos pesados',
      level: 'indicator',
      unit: 'veículos/dia',
      order: 2,
      parentId: vdmMediaIndicator.id,
    })

    await db.insert(indicatorsTransportes).values({
      workgroupId: WORKGROUP_ID,
      name: 'Densidade populacional',
      description: 'Densidade demográfica nas áreas próximas às rodovias',
      level: 'indicator',
      unit: 'hab/km²',
      order: 2,
      parentId: icasvSubindex.id,
    })

    await db.insert(indicatorsTransportes).values({
      workgroupId: WORKGROUP_ID,
      name: 'Acesso prioritário de polos geradores',
      description: 'Presença de polos geradores de tráfego (hospitais, escolas, etc.)',
      level: 'indicator',
      unit: 'índice',
      order: 3,
      parentId: icasvSubindex.id,
    })

    console.log('Nível 3: 15 Indicadores criados')
    console.log('Nível 4: 33 Variáveis criadas (2 Declividade + 7 USO DO SOLO + 22 TIPOS DE SOLO + 2 VMD)')

    // Validar contagem total
    const count = await db
      .select()
      .from(indicatorsTransportes)
      .where(eq(indicatorsTransportes.workgroupId, WORKGROUP_ID))

    console.log(`\nHierarquia de transportes criada. Total: ${count.length} registros.`)
    console.log(`Esperado: 54 (1 índice + 5 subíndices + 15 indicadores + 33 variáveis).`)

    if (count.length !== 54) {
      console.warn('ATENÇÃO: contagem diferente do esperado.')
    }

    return count
  } catch (error) {
    console.error('Erro ao criar hierarquia de transportes:', error)
    throw error
  }
}
