import type { WorkgroupId } from '@napi-aguas/shared'

export interface GpkgWorkgroupSchema {
  workgroupId: WorkgroupId
  layerName: string
  geometryType: string
  acceptedCRS: number[]
  expectedFeatureCount: {
    target: number
    min: number
    max: number
  }
  identifierFields: string[]
  requiredFields: string[]
  optionalFields?: string[]
  numericFields?: string[]
}
