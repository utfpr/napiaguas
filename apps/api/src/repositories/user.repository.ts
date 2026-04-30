import { eq } from 'drizzle-orm'

import { db } from '../db/connection'
import { adminUsers, type AdminUser, type NewAdminUser } from '../db/schema'

export class UserRepository {
  async findByEmail(email: string): Promise<AdminUser | undefined> {
    const results = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.email, email))
      .limit(1)

    return results[0]
  }

  async findById(id: string): Promise<AdminUser | undefined> {
    const results = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.id, id))
      .limit(1)

    return results[0]
  }

  async create(userData: NewAdminUser): Promise<AdminUser> {
    const results = await db
      .insert(adminUsers)
      .values({
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()

    return results[0]
  }

  async updateTimestamp(id: string): Promise<void> {
    await db
      .update(adminUsers)
      .set({ updatedAt: new Date() })
      .where(eq(adminUsers.id, id))
  }
}

export const userRepository = new UserRepository()
