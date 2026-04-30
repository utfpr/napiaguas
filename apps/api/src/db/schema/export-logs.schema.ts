import { index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

import { workgroups } from './workgroups.schema'

export const exportLogs = pgTable(
  'export_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workgroupId: text('workgroup_id')
      .notNull()
      .references(() => workgroups.id),
    indicatorId: uuid('indicator_id').notNull(),
    format: text('format').notNull(), // 'csv' | 'gpkg'
    userIp: text('user_ip').notNull(),
    recordsCount: integer('records_count').notNull(),
    fileSizeBytes: integer('file_size_bytes').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    workgroupIdx: index('idx_export_logs_workgroup').on(table.workgroupId),
    createdAtIdx: index('idx_export_logs_created_at').on(table.createdAt),
  })
)

export type ExportLog = typeof exportLogs.$inferSelect
export type NewExportLog = typeof exportLogs.$inferInsert
