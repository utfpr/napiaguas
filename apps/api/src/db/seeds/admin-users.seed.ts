import type { NodePgDatabase, NodePgTransaction } from 'drizzle-orm/node-postgres'
import * as bcrypt from 'bcrypt'

import { adminUsers } from '../schema'
import type { NewAdminUser } from '../schema'

type DatabaseClient = NodePgDatabase | NodePgTransaction<any, any>

// Cria um usuário admin padrão com credenciais de desenvolvimento.
// As credenciais devem ser alteradas antes de qualquer ambiente produtivo.
export async function seedAdminUsers(db: DatabaseClient) {
  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10)
  const passwordHash = await bcrypt.hash('admin123', saltRounds)

  const adminUsersData: NewAdminUser[] = [
    {
      email: 'admin@napiaguas.com.br',
      passwordHash,
      name: 'Administrador NAPI Águas',
      workgroupId: null,
      role: 'admin',
      active: true,
    },
  ]

  await db.insert(adminUsers).values(adminUsersData).onConflictDoNothing()

  console.log('Usuário admin criado.')
  console.log('  Email: admin@napiaguas.com.br')
  console.log('  Senha: [senha_admin]')
  console.log('  ATENÇÃO: altere essas credenciais em produção.')
}
