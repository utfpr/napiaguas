import {
  check,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

import { workgroups } from './workgroups.schema'

export const indicatorTypeEnum = pgEnum('indicator_type_enum', [
  'indice',
  'subindice',
  'indicador',
])

export const indicatorHierarchy: any = pgTable(
  'indicator_hierarchy',
  {
    id: uuid('id').notNull().primaryKey().defaultRandom(),
    workgroupId: text('workgroup_id')
      .notNull()
      .references(() => workgroups.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    name: text('name').notNull(),
    type: indicatorTypeEnum('type').notNull(),
    parentId: uuid('parent_id').references((): any => indicatorHierarchy.id, {
      onDelete: 'cascade',
    }),
    order: integer('order').notNull().default(0),
    unit: text('unit'),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    codeUnique: uniqueIndex('indicator_hierarchy_code_unique').on(table.code),
    parentConstraint: check(
      'indicator_hierarchy_parent_check',
      sql`
        (
          ${table.type} = 'indice'::indicator_type_enum AND ${table.parentId} IS NULL
        )
        OR (
          ${table.type} <> 'indice'::indicator_type_enum AND ${table.parentId} IS NOT NULL
        )
      `,
    ),
  }),
)

export type IndicatorHierarchy = typeof indicatorHierarchy.$inferSelect
export type NewIndicatorHierarchy = typeof indicatorHierarchy.$inferInsert
