import { readdir, stat, unlink, mkdir } from 'node:fs/promises'
import path from 'node:path'

import { logger } from '@/config/logger'

import { TMP_UPLOAD_DIR } from '@/utils/file-validation'

const CLEANUP_INTERVAL_MS = 15 * 60 * 1000 // 15 minutos
const MAX_FILE_AGE_MS = 60 * 60 * 1000 // 1 hora

class UploadTempCleanupService {
  private interval?: NodeJS.Timeout
  private readonly log = logger.child({ service: 'UploadTempCleanupService' })

  start(): void {
    if (this.interval) {
      return
    }

    this.interval = setInterval(() => {
      this.cleanup().catch((error) => {
        this.log.warn({ error }, 'Falha ao executar cleanup agendado de uploads temporários')
      })
    }, CLEANUP_INTERVAL_MS)

    // Executa uma limpeza inicial sem aguardar o intervalo
    void this.cleanup()
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = undefined
    }
  }

  async cleanup(): Promise<void> {
    await mkdir(TMP_UPLOAD_DIR, { recursive: true })

    // Limpar arquivos temporários do filesystem
    const files = await readdir(TMP_UPLOAD_DIR)
    const now = Date.now()

    await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(TMP_UPLOAD_DIR, file)
        try {
          const stats = await stat(filePath)
          if (now - stats.mtimeMs > MAX_FILE_AGE_MS) {
            await unlink(filePath)
            this.log.info({ filePath }, 'Arquivo temporário de upload removido automaticamente')
          }
        } catch (error) {
          this.log.debug({ filePath, error }, 'Não foi possível remover arquivo temporário')
        }
      })
    )

    // NOTA: A limpeza de dados temporários do banco foi removida
    // Os dados agora são importados diretamente para as tabelas de produção
  }
}

export const uploadTempCleanupService = new UploadTempCleanupService()
