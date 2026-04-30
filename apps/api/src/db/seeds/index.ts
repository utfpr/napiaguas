import 'dotenv/config'

import { closePool, db } from '../../db/connection'
import { seedDatabase } from '../../db/seed'
import { seedGeometries } from './geometries.seed'
import { seedIndicatorValues } from './indicator-values.seed'
import { seedTransportes } from './transportes.seed'
import { seedWorkgroups } from './workgroups.seed'
import { seedAdminUsers } from './admin-users.seed'
import { seedAguaDoceIndicatorHierarchy } from './agua-doce-indicators.seed'
import { seedSaudeIndicators } from './saude-indicators.seed'
import { seedLitoralIndicators } from './litoral-indicators.seed'
import { seedTransportesHierarchy } from './transportes-hierarchy.seed'
import { seedComiteAggregations } from './comite-aggregations.seed'

type SeedArgs = {
  all: boolean
  transportes: boolean
  core: boolean
  saude: boolean
  litoral: boolean
}

function parseArgs(argv: string[]): SeedArgs {
  const all = argv.includes('--all')
  const transportes = argv.includes('--transportes')
  const core = argv.includes('--core') || argv.includes('--agua-doce')
  const saude = argv.includes('--saude')
  const litoral = argv.includes('--litoral')

  if (!all && !transportes && !core && !saude && !litoral && argv.length > 0) {
    const unknown = argv.filter(
      (arg) =>
        !['--all', '--transportes', '--core', '--agua-doce', '--saude', '--litoral'].includes(
          arg,
        ),
    )
    if (unknown.length > 0) {
      console.warn(`Parâmetro(s) desconhecido(s): ${unknown.join(', ')}`)
    }
  }

  return {
    all,
    transportes,
    core,
    saude,
    litoral,
  }
}

async function runTransportesSeed() {
  await db.transaction(async (tx) => {
    await seedWorkgroups(tx)
    // seedTransportes popula geometrias E hierarquia mock - comentado para usar hierarquia real
    // await seedTransportes(tx)
    await seedTransportesHierarchy(tx)
    await seedAdminUsers(tx)
  })
}

async function runCoreSeed() {
  await db.transaction(async (tx) => {
    await seedWorkgroups(tx)
    await seedGeometries(tx)
    await seedAguaDoceIndicatorHierarchy(tx)
    await seedIndicatorValues(tx)
    await seedAdminUsers(tx)
  })
  // Agregações calculadas após commit dos dados base
  await seedComiteAggregations()
}

async function runSaudeSeed() {
  await db.transaction(async (tx) => {
    await seedWorkgroups(tx)
    await seedSaudeIndicators(tx)
    await seedAdminUsers(tx)
  })
}

async function runLitoralSeed() {
  await db.transaction(async (tx) => {
    await seedWorkgroups(tx)
    await seedLitoralIndicators(tx)
    await seedAdminUsers(tx)
  })
}

type SeedCliOptions = {
  silent?: boolean
}

const createLogger =
  (silent: boolean | undefined) =>
  (...messages: unknown[]) => {
    if (!silent) {
      console.log(...messages)
    }
  }

export async function runSeedCli(
  argv: string[],
  options: SeedCliOptions = {},
): Promise<'transportes' | 'core' | 'saude' | 'litoral' | 'all'> {
  const args = parseArgs(argv)
  const log = createLogger(options.silent)

  if (args.transportes) {
    log('Seeding GT Transportes...')
    await runTransportesSeed()
    log('Seed de transportes concluído.')
    return 'transportes'
  }

  if (args.saude) {
    log('Seeding GT Saúde...')
    await runSaudeSeed()
    log('Seed de saúde concluído.')
    return 'saude'
  }

  if (args.litoral) {
    log('Seeding GT Litoral...')
    await runLitoralSeed()
    log('Seed de litoral concluído.')
    return 'litoral'
  }

  if (args.core) {
    log('Seeding base (workgroups + água doce)...')
    await runCoreSeed()
    log('Seed base concluído.')
    return 'core'
  }

  log('Seeding completo do banco (todas as coleções)...')
  await seedDatabase()
  log('Seed completo concluído.')
  return 'all'
}

async function main() {
  await runSeedCli(process.argv.slice(2))
}

main()
  .catch((error) => {
    console.error('Falha ao executar seeds', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await closePool()
  })
