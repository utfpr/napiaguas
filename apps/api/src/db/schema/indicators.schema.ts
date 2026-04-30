import { integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

import { workgroups } from './workgroups.schema'

export const indicators: any = pgTable('indicators', {
  id: text('id').primaryKey(),
  workgroupId: text('workgroup_id')
    .notNull()
    .references(() => workgroups.id),
  parentId: text('parent_id').references((): any => indicators.id),
  name: text('name').notNull(),
  description: text('description'),
  unit: text('unit'),
  type: text('type').notNull(),
  order: integer('order').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export type Indicator = typeof indicators.$inferSelect
export type NewIndicator = typeof indicators.$inferInsert
