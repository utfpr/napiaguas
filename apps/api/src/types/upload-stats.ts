export interface UploadImportStats {
  featuresProcessed: number
  geometriesInserted: number
  geometriesUpdated: number
  indicatorsInserted: number
  indicatorsUpdated: number
  indicatorsLoaded: number
  processingTimeMs: number
  invalidGeometriesCount: number
  invalidGeometryFeatures: string[]
}
