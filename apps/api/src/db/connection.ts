import 'dotenv/config'

import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import * as schema from './schema'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not defined')
}

const poolMin = Number.parseInt(process.env.DB_POOL_MIN ?? '2', 10)
const poolMax = Number.parseInt(process.env.DB_POOL_MAX ?? '10', 10)

export const pool = new Pool({
  connectionString,
  min: Number.isNaN(poolMin) ? 2 : poolMin,
  max: Number.isNaN(poolMax) ? 10 : poolMax,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 2_000,
})

export const db = drizzle(pool, { schema })

let poolClosed = false

export async function closePool() {
  if (poolClosed) {
    return
  }

  poolClosed = true
  await pool.end().catch((error) => {
    console.error('Error closing database pool', error)
  })
}

process.once('beforeExit', () => {
  void closePool()
})
