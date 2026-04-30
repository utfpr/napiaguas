import { stagingRepository } from '@/repositories/staging.repository'

export class StagingCleanupService {
  async executeCleanup(): Promise<{ cleaned: number }> {
    try {
      await stagingRepository.cleanOldStaging()
      return { cleaned: 0 }
    } catch (error) {
      throw new Error(`Failed to clean staging data: ${error}`)
    }
  }

  startCronJob(fastify: any): void {
    const CLEANUP_HOUR = 3

    const scheduleNextCleanup = () => {
      const now = new Date()
      const next = new Date()
      next.setHours(CLEANUP_HOUR, 0, 0, 0)

      if (now > next) {
        next.setDate(next.getDate() + 1)
      }

      const timeUntilNext = next.getTime() - now.getTime()

      setTimeout(async () => {
        try {
          fastify.log.info('Starting staging cleanup...')
          const result = await this.executeCleanup()
          fastify.log.info(`Staging cleanup completed: ${result.cleaned} records removed`)
        } catch (error) {
          fastify.log.error({ err: error }, 'Error during staging cleanup')
        }

        scheduleNextCleanup()
      }, timeUntilNext)

      fastify.log.info(`Next staging cleanup scheduled for: ${next.toISOString()}`)
    }

    scheduleNextCleanup()
  }
}

export const stagingCleanupService = new StagingCleanupService()
