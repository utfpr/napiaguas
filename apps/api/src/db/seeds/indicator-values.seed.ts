import { randomUUID } from 'node:crypto'

import type { NodePgDatabase, NodePgTransaction } from 'drizzle-orm/node-postgres'

import { indicatorValues } from '../schema'
import type { NewIndicatorValue } from '../schema'
import { aguaDoceIndicatorIds } from './agua-doce-indicators.seed'

const indicatorIdByCode = {
  Agricultura: aguaDoceIndicatorIds.Agricultura,
  Mineracao: aguaDoceIndicatorIds.Mineracao,
  Area_urbana: aguaDoceIndicatorIds.AreaUrbana,
  Pastagens: aguaDoceIndicatorIds.Pastagens,
  Silvicultura: aguaDoceIndicatorIds.Silvicultura,
  Precipitacao_var: aguaDoceIndicatorIds.PrecipitacaoVar,
  Tmax_var: aguaDoceIndicatorIds.TmaxVar,
  IFP_norm: aguaDoceIndicatorIds.IFPNorm,
  disF_peixes: aguaDoceIndicatorIds.DisFPeixes,
  disF_bentos: aguaDoceIndicatorIds.DisFBentos,
  Prop_MacNN: aguaDoceIndicatorIds.PropMacNN,
  Prop_MacEPT: aguaDoceIndicatorIds.PropMacEPT,
  Prop_peixesNN: aguaDoceIndicatorIds.PropPeixesNN,
  Prop_peixesEnd: aguaDoceIndicatorIds.PropPeixesEnd,
  Prop_peixesAm: aguaDoceIndicatorIds.PropPeixesAm,
  Prop_peixesMigr: aguaDoceIndicatorIds.PropPeixesMigr,
  redF_bentos: aguaDoceIndicatorIds.RedFBentos,
  redF_peixes: aguaDoceIndicatorIds.RedFPeixes,
  Prop_Bent_N: aguaDoceIndicatorIds.PropBentN,
  ICL: aguaDoceIndicatorIds.ICL,
  UC_perc: aguaDoceIndicatorIds.UCperc,
  Prop_Peix_N: aguaDoceIndicatorIds.PropPeixN,
} as const

type IndicatorCode = keyof typeof indicatorIdByCode

const indicatorValueMatrix: Array<{
  indicatorCode: IndicatorCode
  values: Array<{ hybasId: string; value: number; normalized: number }>
}> = [
  {
    indicatorCode: 'Agricultura',
    values: [
      { hybasId: '6100014540', value: 42.3, normalized: 0.68 },
      { hybasId: '6100014550', value: 37.8, normalized: 0.59 },
      { hybasId: '6100014560', value: 51.6, normalized: 0.81 },
      { hybasId: '6100014570', value: 29.1, normalized: 0.43 },
    ],
  },
  {
    indicatorCode: 'Area_urbana',
    values: [
      { hybasId: '6100014540', value: 18.2, normalized: 0.74 },
      { hybasId: '6100014550', value: 11.5, normalized: 0.46 },
      { hybasId: '6100014560', value: 14.8, normalized: 0.61 },
      { hybasId: '6100014570', value: 7.2, normalized: 0.28 },
    ],
  },
  {
    indicatorCode: 'Prop_peixesEnd',
    values: [
      { hybasId: '6100014540', value: 0.34, normalized: 0.55 },
      { hybasId: '6100014550', value: 0.29, normalized: 0.42 },
      { hybasId: '6100014560', value: 0.41, normalized: 0.71 },
      { hybasId: '6100014590', value: 0.25, normalized: 0.33 },
    ],
  },
  {
    indicatorCode: 'UC_perc',
    values: [
      { hybasId: '6100014540', value: 22.5, normalized: 0.75 },
      { hybasId: '6100014550', value: 14.3, normalized: 0.48 },
      { hybasId: '6100014560', value: 19.7, normalized: 0.64 },
      { hybasId: '6100014570', value: 27.1, normalized: 0.91 },
    ],
  },
]

type DatabaseClient = NodePgDatabase | NodePgTransaction<any, any>

export async function seedIndicatorValues(db: DatabaseClient) {
  const values: NewIndicatorValue[] = indicatorValueMatrix.flatMap(
    ({ indicatorCode, values }) =>
      values.map((value) => ({
        id: randomUUID(),
        indicatorId: indicatorIdByCode[indicatorCode],
        hybasId: value.hybasId,
        value: value.value.toString(),
        normalizedValue: value.normalized.toString(),
      })),
  )

  await db.insert(indicatorValues).values(values).onConflictDoNothing()
}
