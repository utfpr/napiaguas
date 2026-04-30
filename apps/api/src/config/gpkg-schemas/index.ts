import type { WorkgroupId } from '@napi-aguas/shared'

import { AGUA_DOCE_SCHEMA } from './agua-doce-schema'
import { LITORAL_SCHEMA } from './litoral-schema'
import { SAUDE_SCHEMA } from './saude-schema'
import { TRANSPORTES_SCHEMA } from './transportes-schema'
import type { GpkgWorkgroupSchema } from './types'

export * from './agua-doce-schema'
export * from './litoral-schema'
export * from './saude-schema'
export * from './transportes-schema'
export * from './types'

/**
 * Mapa de schemas por workgroup ID
 */
export const GPKG_SCHEMAS: Record<WorkgroupId, GpkgWorkgroupSchema> = {
  'agua-doce': AGUA_DOCE_SCHEMA,
  saude: SAUDE_SCHEMA,
  litoral: LITORAL_SCHEMA,
  transportes: TRANSPORTES_SCHEMA,
}

/**
 * Obtém o schema de validação para um workgroup específico
 */
export function getWorkgroupSchema(workgroupId: WorkgroupId): GpkgWorkgroupSchema {
  const schema = GPKG_SCHEMAS[workgroupId]
  if (!schema) {
    throw new Error(`Schema não encontrado para workgroup: ${workgroupId}`)
  }
  return schema
}

/**
 * Obtém o nome legível do workgroup
 */
export function getWorkgroupName(workgroupId: WorkgroupId): string {
  const names: Record<WorkgroupId, string> = {
    'agua-doce': 'Água Doce',
    saude: 'Saúde',
    litoral: 'Litoral',
    transportes: 'Transportes',
  }
  return names[workgroupId]
}
