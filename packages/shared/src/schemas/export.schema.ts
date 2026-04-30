import { z } from 'zod'

/**
 * Schema para validação de request de exportação CSV
 */
export const ExportRequestSchema = z.object({
  workgroup: z.enum(['agua-doce', 'litoral', 'saude', 'transportes']),
  indicator_id: z.string().uuid('indicator_id deve ser um UUID válido'),
  municipality_ids: z.array(z.string().uuid()).optional(),
  subbacia_ids: z.array(z.string().uuid()).optional(),
})

export type ExportRequest = z.infer<typeof ExportRequestSchema>

/**
 * Schema para log de exportação
 */
export const ExportLogSchema = z.object({
  id: z.string().uuid().optional(),
  workgroup_id: z.string(),
  indicator_id: z.string().uuid(),
  format: z.enum(['csv', 'gpkg']),
  user_ip: z.string(),
  records_count: z.number().int().nonnegative(),
  file_size_bytes: z.number().int().nonnegative(),
  created_at: z.date().optional(),
})

export type ExportLog = z.infer<typeof ExportLogSchema>

/**
 * Schema para preview de exportação
 */
export const ExportPreviewSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      indicator_value: z.string(),
      lat: z.number(),
      lng: z.number(),
    })
  ),
  total_records: z.number().int().nonnegative(),
  preview_count: z.number().int().nonnegative(),
})

export type ExportPreview = z.infer<typeof ExportPreviewSchema>

/**
 * Schema para erro de exportação muito grande
 */
export const ExportTooLargeErrorSchema = z.object({
  error: z.object({
    code: z.literal('EXPORT_TOO_LARGE'),
    message: z.string(),
    records_found: z.number().int(),
    max_records: z.number().int(),
  }),
})

export type ExportTooLargeError = z.infer<typeof ExportTooLargeErrorSchema>

/**
 * Schema para erro de indicador não encontrado
 */
export const IndicatorNotFoundErrorSchema = z.object({
  error: z.object({
    code: z.literal('INDICATOR_NOT_FOUND'),
    message: z.string(),
  }),
})

export type IndicatorNotFoundError = z.infer<typeof IndicatorNotFoundErrorSchema>
