import 'dotenv/config'

import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import path from 'node:path'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL é obrigatório para executar migrations')
}

const pool = new Pool({ connectionString })
const db = drizzle(pool)

const migrationsFolder = path.resolve(__dirname, './migrations')

async function main() {
  console.log('Executando migrations...')
  await migrate(db, { migrationsFolder })
  console.log('Migrations concluídas.')
}

main()
  .catch((error) => {
    console.error('Falha ao executar migrations', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await pool.end()
  })
