import { boolean, pgTable, text, timestamp, uuid, pgEnum } from 'drizzle-orm/pg-core'
import { workgroups } from './workgroups.schema'

// Enum de papéis de usuário
export const userRoleEnum = pgEnum('user_role', ['admin', 'gt_member'])

export const adminUsers = pgTable('admin_users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  workgroupId: text('workgroup_id').references(() => workgroups.id),
  role: userRoleEnum('role').notNull().default('gt_member'),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export type AdminUser = typeof adminUsers.$inferSelect
export type NewAdminUser = typeof adminUsers.$inferInsert
