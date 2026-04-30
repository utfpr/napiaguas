#!/usr/bin/env node
// Cria usuários administrativos via linha de comando.
// Uso: pnpm db:create-user --email=... --password=... --name=... [--role=...] [--workgroup=...]

import 'dotenv/config'
import * as bcrypt from 'bcrypt'
import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { eq } from 'drizzle-orm'

import { adminUsers } from '../db/schema'

type UserRole = 'admin' | 'gt_member'
type WorkgroupId = 'agua-doce' | 'saude' | 'litoral' | 'transportes' | null

interface CreateUserParams {
  email: string
  password: string
  name: string
  role: UserRole
  workgroupId: WorkgroupId
}

const VALID_ROLES: UserRole[] = ['admin', 'gt_member']
const VALID_WORKGROUPS = ['agua-doce', 'saude', 'litoral', 'transportes']
const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10)

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
}

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function showHelp() {
  console.log(`
NAPI Águas - criar usuário administrativo

Uso:
  node dist/src/scripts/create-user.js [opções]
  pnpm db:create-user --email=... --password=... --name=...

Obrigatórios:
  --email=<email>     Email único do usuário
  --password=<senha>  Senha (mínimo 8 caracteres)
  --name=<nome>       Nome completo

Opcionais:
  --role=<papel>      "admin" ou "gt_member" (padrão: gt_member)
  --workgroup=<gt>    "agua-doce", "saude", "litoral" ou "transportes"
  --help              Mostra esta ajuda

Requer DATABASE_URL configurada. Senhas são armazenadas com hash bcrypt.
`)
}

function parseArgs(): Record<string, string> {
  const args: Record<string, string> = {}

  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--')) {
      const [key, ...valueParts] = arg.slice(2).split('=')
      const value = valueParts.join('=')
      args[key] = value || 'true'
    }
  }

  return args
}

function validateParams(args: Record<string, string>): CreateUserParams {
  const errors: string[] = []

  if (!args.email) {
    errors.push('--email é obrigatório')
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(args.email)) {
    errors.push('--email deve ser um email válido')
  }

  if (!args.password) {
    errors.push('--password é obrigatório')
  } else if (args.password.length < 8) {
    errors.push('--password deve ter no mínimo 8 caracteres')
  }

  if (!args.name) {
    errors.push('--name é obrigatório')
  } else if (args.name.length < 2) {
    errors.push('--name deve ter no mínimo 2 caracteres')
  }

  const role = (args.role || 'gt_member') as UserRole
  if (!VALID_ROLES.includes(role)) {
    errors.push(`--role deve ser um de: ${VALID_ROLES.join(', ')}`)
  }

  let workgroupId: WorkgroupId = null
  if (args.workgroup) {
    if (!VALID_WORKGROUPS.includes(args.workgroup)) {
      errors.push(`--workgroup deve ser um de: ${VALID_WORKGROUPS.join(', ')}`)
    } else {
      workgroupId = args.workgroup as WorkgroupId
    }
  }

  if (errors.length > 0) {
    log('\nErros de validação:', 'red')
    errors.forEach((e) => log(`  - ${e}`, 'red'))
    log('\nUse --help para ver as opções.\n', 'yellow')
    process.exit(1)
  }

  return {
    email: args.email,
    password: args.password,
    name: args.name,
    role,
    workgroupId,
  }
}

async function createUser(params: CreateUserParams) {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    log('\nErro: DATABASE_URL não está definida.', 'red')
    process.exit(1)
  }

  const pool = new Pool({
    connectionString,
    max: 1,
    idleTimeoutMillis: 5000,
    connectionTimeoutMillis: 5000,
  })

  const db = drizzle(pool)

  try {
    log('\nConectando ao banco de dados...', 'cyan')

    const existing = await db
      .select({ id: adminUsers.id })
      .from(adminUsers)
      .where(eq(adminUsers.email, params.email))
      .limit(1)

    if (existing.length > 0) {
      log(`\nErro: email "${params.email}" já está cadastrado.`, 'red')
      await pool.end()
      process.exit(1)
    }

    log('Gerando hash da senha...', 'cyan')
    const passwordHash = await bcrypt.hash(params.password, SALT_ROUNDS)

    log('Inserindo usuário no banco...', 'cyan')
    const [newUser] = await db
      .insert(adminUsers)
      .values({
        email: params.email,
        passwordHash,
        name: params.name,
        role: params.role,
        workgroupId: params.workgroupId,
        active: true,
      })
      .returning({
        id: adminUsers.id,
        email: adminUsers.email,
        name: adminUsers.name,
        role: adminUsers.role,
        workgroupId: adminUsers.workgroupId,
      })

    log('\nUsuário criado com sucesso.', 'green')
    log(`  ID:        ${newUser.id}`, 'green')
    log(`  Email:     ${newUser.email}`, 'green')
    log(`  Nome:      ${newUser.name}`, 'green')
    log(`  Role:      ${newUser.role}`, 'green')
    log(`  Workgroup: ${newUser.workgroupId || '(nenhum)'}`, 'green')

    await pool.end()
    process.exit(0)
  } catch (error) {
    log(`\nErro ao criar usuário: ${error instanceof Error ? error.message : 'erro desconhecido'}`, 'red')
    await pool.end()
    process.exit(1)
  }
}

async function main() {
  const args = parseArgs()

  if (args.help || process.argv.length <= 2) {
    showHelp()
    process.exit(0)
  }

  const params = validateParams(args)
  await createUser(params)
}

main().catch((error) => {
  log(`\nErro fatal: ${error instanceof Error ? error.message : 'erro desconhecido'}`, 'red')
  process.exit(1)
})
