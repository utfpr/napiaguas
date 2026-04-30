import { sql } from 'drizzle-orm'

import { db, closePool } from './connection'
import { seedWorkgroups } from './seeds/workgroups.seed'
import { seedAguaDoceIndicatorHierarchy } from './seeds/agua-doce-indicators.seed'
import { seedSaudeIndicators } from './seeds/saude-indicators.seed'

const tablesToTruncateInOrder = [
  'upload_logs',
  'staging_uploads',
  'export_logs',
  'indicator_data',
  'indicator_values',
  'health_indicator_values',
  'indicator_hierarchy',
  'indicators_transportes',
  'geometries_transportes',
  'geometries_agua_doce',
  'municipality_geometries',
  'hydrobasins_geometries',
  'indicators',
]

async function cleanDatabasePreservingAdminUsers() {
  console.log('Iniciando limpeza do banco (preservando admin_users)...')
  try {
    await db.transaction(async (tx) => {
      for (const tableName of tablesToTruncateInOrder) {
        const result = await tx.execute<{ exists: boolean }>(
          sql.raw(`
            SELECT EXISTS (
              SELECT FROM information_schema.tables
              WHERE table_schema = 'public'
              AND table_name = '${tableName}'
            ) as exists
          `)
        )

        const tableExists = result.rows[0]?.exists

        if (tableExists) {
          console.log(`  Truncando tabela "${tableName}"`)
          await tx.execute(sql.raw(`TRUNCATE TABLE "${tableName}" RESTART IDENTITY CASCADE;`))
        } else {
          console.log(`  Tabela "${tableName}" não existe, pulando...`)
        }
      }

      console.log('  Limpando relação de GTs preservando usuários admin')
      await tx.execute(sql.raw('UPDATE "admin_users" SET workgroup_id = NULL WHERE workgroup_id IS NOT NULL;'))
      await tx.execute(sql.raw('DELETE FROM "workgroups";'))

      console.log('  Recriando GTs padrão')
      await seedWorkgroups(tx)

      console.log('  Recriando indicadores de Água Doce')
      await seedAguaDoceIndicatorHierarchy(tx)

      console.log('  Recriando indicadores de Saúde')
      await seedSaudeIndicators(tx)
    })

    console.log('Limpeza concluída. Usuários admin preservados.')
  } finally {
    await closePool()
  }
}

cleanDatabasePreservingAdminUsers().catch((error) => {
  console.error('Falha ao limpar banco', error)
  process.exitCode = 1
})
