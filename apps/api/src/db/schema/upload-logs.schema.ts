import { index, pgTable, uuid, varchar, bigint, integer, jsonb, timestamp, check, text } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

import type { GpkgValidationError } from '@napi-aguas/shared'

import { adminUsers } from './admin-users.schema'
import { workgroups } from './workgroups.schema'
import type { UploadImportStats } from '@/types/upload-stats'

/**
 * Tabela de logs de upload para auditoria
 */
export const uploadLogs = pgTable(
  'upload_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => adminUsers.id, { onDelete: 'cascade' }),
    workgroupId: text('workgroup_id')
      .notNull()
      .references(() => workgroups.id),
    filename: varchar('filename', { length: 255 }).notNull(),
    fileSizeBytes: bigint('file_size_bytes', { mode: 'number' }).notNull(),
    mimeType: varchar('mime_type', { length: 100 }),
    status: varchar('status', { length: 20 }).notNull(),
    featuresCount: integer('features_count'),
    indicatorsLoaded: integer('indicators_loaded'),
    errors: jsonb('errors').$type<GpkgValidationError[]>(),
    stats: jsonb('stats').$type<UploadImportStats>(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => ({
    userIdx: index('idx_upload_logs_user_id').on(table.userId),
    statusIdx: index('idx_upload_logs_status').on(table.status),
    createdAtIdx: index('idx_upload_logs_created_at').on(table.createdAt),
    statusCheck: check(
      'upload_logs_status_check',
      sql`${table.status} in ('processing', 'validating', 'completed', 'failed', 'committed', 'cancelled', 'expired')`
    ),
  })
)

export type UploadLog = typeof uploadLogs.$inferSelect
export type NewUploadLog = typeof uploadLogs.$inferInsert
