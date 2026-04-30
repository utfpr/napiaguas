import { pgTable, uuid, varchar, jsonb, timestamp } from 'drizzle-orm/pg-core'

/**
 * Tabela de staging para uploads
 * Armazena dados temporários antes do commit final em produção
 */
export const stagingUploads = pgTable('staging_uploads', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  workgroupId: varchar('workgroup_id', { length: 50 }).notNull(),
  indicatorId: uuid('indicator_id').notNull(),
  filename: varchar('filename', { length: 255 }).notNull(),
  data: jsonb('data').notNull(), // GeoJSON ou array de objetos CSV
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export type StagingUpload = typeof stagingUploads.$inferSelect
export type NewStagingUpload = typeof stagingUploads.$inferInsert
