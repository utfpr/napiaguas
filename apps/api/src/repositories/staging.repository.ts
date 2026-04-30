import { eq } from 'drizzle-orm'

import { db } from '@/db/connection'
import { stagingUploads, type NewStagingUpload, type StagingUpload } from '@/db/schema'

export class StagingRepository {
  /**
   * Salva dados parseados em staging para preview
   */
  async saveToStaging(uploadData: NewStagingUpload): Promise<StagingUpload> {
    const [result] = await db.insert(stagingUploads).values(uploadData).returning()

    return result
  }

  /**
   * Recupera dados de staging para preview
   */
  async getFromStaging(uploadId: string): Promise<StagingUpload | undefined> {
    const [result] = await db
      .select()
      .from(stagingUploads)
      .where(eq(stagingUploads.id, uploadId))

    return result
  }

  /**
   * Deleta dados de staging após confirmação ou cancelamento
   */
  async deleteFromStaging(uploadId: string): Promise<void> {
    await db.delete(stagingUploads).where(eq(stagingUploads.id, uploadId))
  }

  /**
   * Limpa dados de staging antigos (mais de 24 horas)
   */
  async cleanOldStaging(): Promise<void> {
    const oneDayAgo = new Date()
    oneDayAgo.setHours(oneDayAgo.getHours() - 24)

    await db.delete(stagingUploads).where(eq(stagingUploads.createdAt, oneDayAgo))
  }
}

export const stagingRepository = new StagingRepository()
