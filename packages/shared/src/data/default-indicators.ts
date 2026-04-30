import type { IndicatorNode } from '../schemas/indicator.schema'

export const defaultIndicators: IndicatorNode[] = [
  {
    id: 'idx-vuln-aquatica',
    name: 'Índice de Vulnerabilidade Aquática',
    description: 'Composição geral da vulnerabilidade de água doce',
    type: 'index',
    order: 1,
    children: [
      {
        id: 'subidx-exposicao',
        name: 'Subíndice de Exposição',
        description: 'Fatores de pressão externos',
        type: 'subindex',
        order: 1,
        children: [
          {
            id: 'ind-agricultura',
            name: 'Intensidade da Agricultura',
            description: 'Proporção de área agrícola na subbacia',
            unit: 'mm/ano',
            type: 'indicator',
            order: 1,
            children: [],
          },
          {
            id: 'ind-urbanizacao',
            name: 'Taxa de Urbanização',
            description: 'Percentual de área urbanizada em regiões de risco',
            unit: '%',
            type: 'indicator',
            order: 2,
            children: [],
          },
        ],
      },
      {
        id: 'subidx-sensibilidade',
        name: 'Subíndice de Sensibilidade',
        description: 'Sensibilidade intrínseca das subbacias',
        type: 'subindex',
        order: 2,
        children: [
          {
            id: 'ind-biodiversidade',
            name: 'Biodiversidade Aquática',
            description: 'Índice composto de biodiversidade',
            unit: 'índice',
            type: 'indicator',
            order: 1,
            children: [],
          },
          {
            id: 'ind-qualidade-agua',
            name: 'Qualidade da Água',
            description: 'Média ponderada de indicadores físico-químicos',
            unit: 'mg/L',
            type: 'indicator',
            order: 2,
            children: [],
          },
        ],
      },
    ],
  },
]
