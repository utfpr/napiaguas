import 'dotenv/config'

import { db, closePool } from '../connection'
import { seedAdminUsers } from './admin-users.seed'

async function main() {
  console.log('Executando seed de usuários admin...')

  try {
    await db.transaction(async (tx) => {
      await seedAdminUsers(tx)
    })
    console.log('Seed de usuários admin concluído.')
  } catch (error) {
    console.error('Erro ao executar seed de usuários admin:', error)
    process.exitCode = 1
  } finally {
    await closePool()
  }
}

main()
