import {
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

import { workgroups } from './workgroups.schema'

export const transportIndicatorLevelEnum = pgEnum('indicator_level_enum', [
  'index',
  'subindex',
  'indicator',
])

export const indicatorsTransportes: any = pgTable('indicators_transportes', {
  id: uuid('id').defaultRandom().primaryKey(),
  workgroupId: text('workgroup_id')
    .notNull()
    .references(() => workgroups.id),
  parentId: uuid('parent_id').references((): any => indicatorsTransportes.id, {
    onDelete: 'cascade',
  }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  unit: varchar('unit', { length: 50 }),
  level: transportIndicatorLevelEnum('level').notNull(),
  order: integer('order').default(0).notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export type IndicatorTransporte = typeof indicatorsTransportes.$inferSelect
export type NewIndicatorTransporte = typeof indicatorsTransportes.$inferInsert
