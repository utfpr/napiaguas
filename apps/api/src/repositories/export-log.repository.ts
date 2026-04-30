import { and, gte, lte, eq } from 'drizzle-orm'

import { db } from '../db/connection'
import { exportLogs, type NewExportLog } from '../db/schema'

export type { NewExportLog }

export class ExportLogRepository {
  /**
   * Insere um novo registro de exportação no log
   */
  async createExportLog(data: NewExportLog): Promise<void> {
    await db.insert(exportLogs).values(data)
  }

  /**
   * Consulta o total de exportações por período (útil para limites operacionais)
   */
  async getExportCountByPeriod(
    startDate: Date,
    endDate: Date,
    workgroupId?: string
  ): Promise<number> {
    const conditions = [
      gte(exportLogs.createdAt, startDate),
      lte(exportLogs.createdAt, endDate),
    ]

    if (workgroupId) {
      conditions.push(eq(exportLogs.workgroupId, workgroupId))
    }

    const results = await db
      .select()
      .from(exportLogs)
      .where(and(...conditions))

    return results.length
  }
}

export const exportLogRepository = new ExportLogRepository()
