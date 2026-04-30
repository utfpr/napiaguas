import 'dotenv/config'

import { Pool } from 'pg'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required to reset the database')
}

const pool = new Pool({ connectionString })

async function resetDatabase() {
  console.log('Resetting database schema "public"...')

  await pool.query('DROP SCHEMA IF EXISTS public CASCADE;')
  await pool.query('CREATE SCHEMA public;')
  await pool.query('ALTER SCHEMA public OWNER TO CURRENT_USER;')
  await pool.query('GRANT ALL ON SCHEMA public TO CURRENT_USER;')
  await pool.query('GRANT ALL ON SCHEMA public TO PUBLIC;')

  console.log('Re-enabling required extensions...')
  await pool.query('CREATE EXTENSION IF NOT EXISTS postgis;')
  await pool.query('CREATE EXTENSION IF NOT EXISTS postgis_topology;')
  await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";')

  console.log('Database reset completed.')
}

resetDatabase()
  .catch((error) => {
    console.error('Failed to reset database', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await pool.end()
  })
