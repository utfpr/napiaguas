import { boolean, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const workgroups = pgTable('workgroups', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  icon: text('icon'),
  color: text('color'),
  geometryType: text('geometry_type').notNull(),
  active: boolean('active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export type Workgroup = typeof workgroups.$inferSelect
export type NewWorkgroup = typeof workgroups.$inferInsert
