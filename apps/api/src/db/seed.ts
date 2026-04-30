import 'dotenv/config'
import { sql } from 'drizzle-orm'

import { closePool, db } from './connection'
import {
  geometriesTransportes,
  hydrobasinsGeometries,
  indicatorData,
  indicatorHierarchy,
  indicatorValues,
  workgroups,
} from './schema'
import { seedGeometries } from './seeds/geometries.seed'
import { seedIndicatorValues } from './seeds/indicator-values.seed'
import { seedTransportesHierarchy } from './seeds/transportes-hierarchy.seed'
import { seedWorkgroups } from './seeds/workgroups.seed'
import { seedAdminUsers } from './seeds/admin-users.seed'
import { seedAguaDoceIndicatorHierarchy } from './seeds/agua-doce-indicators.seed'
import { seedSaudeIndicators } from './seeds/saude-indicators.seed'
import { seedLitoralIndicators } from './seeds/litoral-indicators.seed'
import { seedComiteAggregations } from './seeds/comite-aggregations.seed'

export async function seedDatabase() {
  await db.transaction(async (tx) => {
    await tx.execute(
      sql.raw(
        `
        TRUNCATE TABLE
          comite_aggregations,
          indicator_data,
          indicator_values,
          indicator_hierarchy,
          indicators_transportes,
          geometries_transportes,
          hydrobasins_geometries,
          admin_users,
          workgroups
        RESTART IDENTITY CASCADE
        `,
      ),
    )

    await seedWorkgroups(tx)
    await seedGeometries(tx)
    await seedAguaDoceIndicatorHierarchy(tx)
    await seedSaudeIndicators(tx)
    await seedLitoralIndicators(tx)
    await seedIndicatorValues(tx)
    await seedTransportesHierarchy(tx)
    await seedAdminUsers(tx)
  })
  // Agregações calculadas após commit dos dados base
  await seedComiteAggregations()
}

async function main() {
  console.log('Executando seed do banco...')
  await seedDatabase()
  console.log('Seed concluído.')
}

const isDirectExecution = typeof require !== 'undefined' && require.main === module

if (isDirectExecution) {
  main()
    .catch((error) => {
      console.error('Falha ao executar seed', error)
      process.exitCode = 1
    })
    .finally(async () => {
      await closePool()
    })
}
