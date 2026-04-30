import { desc, eq } from 'drizzle-orm'

import type { GpkgValidationError } from '@napi-aguas/shared'

import { db } from '@/db/connection'
import { uploadLogs, type UploadLog } from '@/db/schema'
import type { UploadImportStats } from '@/types/upload-stats'

type UploadStatus = 'processing' | 'validating' | 'completed' | 'failed' | 'committed' | 'cancelled' | 'expired'

interface CreateUploadLogInput {
  id: string
  userId: string
  workgroupId: string
  filename: string
  fileSizeBytes: number
  mimeType?: string
}

interface UpdateUploadLogInput {
  status?: UploadStatus
  errors?: GpkgValidationError[]
  featuresCount?: number
  indicatorsLoaded?: number
  stats?: UploadImportStats
  completedAt?: Date
}

export class UploadLogRepository {
  async createLog(data: CreateUploadLogInput): Promise<UploadLog> {
    const [result] = await db.insert(uploadLogs).values({
      id: data.id,
      userId: data.userId,
      workgroupId: data.workgroupId,
      filename: data.filename,
      fileSizeBytes: data.fileSizeBytes,
      mimeType: data.mimeType,
      status: 'processing',
    }).returning()

    return result
  }

  async update(uploadId: string, data: UpdateUploadLogInput): Promise<UploadLog | undefined> {
    if (Object.keys(data).length === 0) {
      const [existing] = await db
        .select()
        .from(uploadLogs)
        .where(eq(uploadLogs.id, uploadId))
        .limit(1)

      return existing
    }

    const updatePayload: Partial<typeof uploadLogs.$inferInsert> = {}

    if (data.status) {
      updatePayload.status = data.status
    }
    if (data.errors) {
      updatePayload.errors = data.errors
    }
    if (typeof data.featuresCount === 'number') {
      updatePayload.featuresCount = data.featuresCount
    }
    if (typeof data.indicatorsLoaded === 'number') {
      updatePayload.indicatorsLoaded = data.indicatorsLoaded
    }
    if (data.stats) {
      updatePayload.stats = data.stats
    }
    if (data.completedAt) {
      updatePayload.completedAt = data.completedAt
    }

    const [result] = await db
      .update(uploadLogs)
      .set(updatePayload)
      .where(eq(uploadLogs.id, uploadId))
      .returning()

    return result
  }

  async updateStatus(uploadId: string, status: UploadStatus): Promise<UploadLog | undefined> {
    return this.update(uploadId, { status })
  }

  async getLog(uploadId: string): Promise<UploadLog | undefined> {
    const [result] = await db.select().from(uploadLogs).where(eq(uploadLogs.id, uploadId))

    return result
  }

  async getLogsByUser(userId: string, limit = 50): Promise<UploadLog[]> {
    return db
      .select()
      .from(uploadLogs)
      .where(eq(uploadLogs.userId, userId))
      .orderBy(desc(uploadLogs.createdAt))
      .limit(limit)
  }

  async getLogsByWorkgroup(workgroupId: string, limit = 50): Promise<UploadLog[]> {
    return db
      .select()
      .from(uploadLogs)
      .where(eq(uploadLogs.workgroupId, workgroupId))
      .orderBy(desc(uploadLogs.createdAt))
      .limit(limit)
  }
}

export const uploadLogRepository = new UploadLogRepository()
