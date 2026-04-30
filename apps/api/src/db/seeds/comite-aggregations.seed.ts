import { comiteAggregationService } from '../../services/comite-aggregation.service'
import { logger } from '../../config/logger'

// Calcula e persiste agregações por comitê de bacia.
// Deve rodar após seedIndicatorValues (depende de indicator_values e hydrobasins_geometries).
export async function seedComiteAggregations(): Promise<void> {
  logger.info('Iniciando seed de agregações por comitê...')

  const count = await comiteAggregationService.calculateAndPersist()

  logger.info({ count }, 'Seed de agregações por comitê concluído')
}
