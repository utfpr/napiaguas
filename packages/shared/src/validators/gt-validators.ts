import type { ZodIssue } from 'zod'

import {
  gtLitoralMunicipioSchema,
  gtSaudeMunicipioSchema,
} from '../schemas/gt-schemas'
import type { GTLitoralMunicipio } from '../types/gt-litoral.types'
import type { GTSaudeMunicipio } from '../types/gt-saude.types'

export type SchemaValidationResult<TData> =
  | { success: true; data: TData }
  | { success: false; errors: string[] }

const formatIssues = (issues: ZodIssue[]): string[] =>
  issues.map((issue) => {
    const path = issue.path.length ? `${issue.path.join('.')}: ` : ''
    return `${path}${issue.message}`
  })

/**
 * Valida dados de municípios do GT Litoral, garantindo aderência ao schema Zod.
 */
export const validateGTLitoralData = (
  data: unknown,
): SchemaValidationResult<GTLitoralMunicipio> => {
  const parsed = gtLitoralMunicipioSchema.safeParse(data)
  if (parsed.success) {
    return { success: true, data: parsed.data as GTLitoralMunicipio }
  }

  return {
    success: false,
    errors: formatIssues(parsed.error.issues),
  }
}

/**
 * Valida dados de municípios do GT Saúde conforme schema definido.
 */
export const validateGTSaudeData = (
  data: unknown,
): SchemaValidationResult<GTSaudeMunicipio> => {
  const parsed = gtSaudeMunicipioSchema.safeParse(data)
  if (parsed.success) {
    return { success: true, data: parsed.data as GTSaudeMunicipio }
  }

  return {
    success: false,
    errors: formatIssues(parsed.error.issues),
  }
}
