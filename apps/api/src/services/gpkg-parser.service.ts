import { access } from 'node:fs/promises'
import { constants as fsConstants } from 'node:fs'

import gdal, { type Layer, type SpatialReference } from 'gdal-async'

import {
  GpkgErrorType,
  type GpkgValidationError,
  type ValidationResult,
  type WorkgroupId,
} from '@napi-aguas/shared'

import { isValidGPKG } from '../utils/gdal'
import { getWorkgroupName, getWorkgroupSchema } from '../config/gpkg-schemas'
import type { GpkgWorkgroupSchema as _GpkgWorkgroupSchema } from '../config/gpkg-schemas/types'

type GeoJSONGeometry = {
  type: string
  coordinates: unknown
}

export interface GeoJSONFeature {
  type: 'Feature'
  id?: string | number
  properties: Record<string, unknown>
  geometry: GeoJSONGeometry | null
}

export interface ParsedGpkgField {
  name: string
  type: string
}

export interface ParsedGpkgCrs {
  authority?: string
  code?: string
  epsg?: number
  wkt?: string
}

export interface ParsedGpkgData {
  availableLayers: string[]
  layerName: string
  geometryColumn: string
  geometryType: string
  fields: ParsedGpkgField[]
  features: GeoJSONFeature[]
  crs?: ParsedGpkgCrs
}

export class GpkgParserTimeoutError extends Error {
  constructor(message = 'Parsing timeout após 30s') {
    super(message)
    this.name = 'GpkgParserTimeoutError'
  }
}

interface ValidationSummary {
  schema: ValidationResult
  crs: ValidationResult
  geometry: ValidationResult
  values: ValidationResult
}

export const REQUIRED_NUMERIC_FIELDS = [
  'IVCaq',
  'Exposicao',
  'Sensibilidade',
  'Capacidade_Adaptativa',
  'Agricultura',
  'Mineracao',
  'Area_urbana',
  'Pastagens',
  'Silvicultura',
  'Precipitacao_var',
  'Tmax_var',
  'IFP_norm',
  'disF_peixes',
  'disF_bentos',
  'Prop_MacNN',
  'Prop_MacEPT',
  'Prop_peixesNN',
  'Prop_peixesEnd',
  'Prop_peixesAm',
  'Prop_peixesMigr',
  'redF_bentos',
  'redF_peixes',
  'Prop_Bent_N',
  'ICL',
  'UC_perc',
  'Prop_Peix_N',
]

export const REQUIRED_FIELDS = ['HYBAS_ID', ...REQUIRED_NUMERIC_FIELDS]

export const OPTIONAL_FIELDS = ['NOME_COMIT']

const VALID_GEOMETRIES = ['polygon', 'multipolygon', 'linestring']

export const MAX_GEOMETRY_ERRORS = 100
export const MAX_OPERATION_DURATION_MS = 30_000

export class GpkgParserService {
  constructor(private readonly clock: () => number = Date.now) {}

  /**
   * Faz o parsing de um arquivo GPKG para um workgroup específico
   * @param filePath Caminho para o arquivo GPKG
   * @param workgroupId Identificador do workgroup/GT
   * @param layerName Nome da layer (opcional - usa a do schema se não informado)
   * @returns Dados parseados do GPKG
   */
  async parseGpkg(
    filePath: string,
    workgroupId: WorkgroupId,
    layerName?: string
  ): Promise<ParsedGpkgData> {
    await this.ensureReadable(filePath)

    if (!(await isValidGPKG(filePath))) {
      throw new Error(`Arquivo inválido ou corrompido: ${filePath}`)
    }

    const start = this.clock()
    const dataset = await gdal.openAsync(filePath)

    try {
      const availableLayers = Array.from(dataset.layers, (layer) => layer.name)

      if (availableLayers.length === 0) {
        throw new Error('Nenhuma layer encontrada no arquivo GPKG')
      }

      // Usar layer do schema se não informado explicitamente
      const schema = getWorkgroupSchema(workgroupId)
      const targetLayerName = layerName ?? schema.layerName

      let targetLayer
      try {
        targetLayer = dataset.layers.get(targetLayerName)
      } catch (_error) {
        // Se falhar ao buscar a layer específica, tentar a primeira disponível
        targetLayer = null
      }

      // Se a layer do schema não existir, tentar a primeira disponível
      if (!targetLayer && availableLayers.length > 0) {
        try {
          targetLayer = dataset.layers.get(availableLayers[0])
        } catch (_error) {
          throw new Error(
            `Falha ao acessar layers do arquivo GPKG. Layers disponíveis: ${availableLayers.join(', ')}`
          )
        }
      }

      if (!targetLayer) {
        throw new Error(
          `Layer "${targetLayerName}" não encontrada. Layers disponíveis: ${availableLayers.join(', ')}`
        )
      }

      const fields = this.collectFields(targetLayer)
      const features = this.collectFeatures(targetLayer, start)
      const crs = this.extractCrs(targetLayer.srs)
      const geometryType = this.normalizeGeometryType(
        gdal.Geometry.getName(targetLayer.geomType)
      )

      return {
        availableLayers,
        layerName: targetLayer.name,
        geometryColumn: targetLayer.geomColumn,
        geometryType,
        fields,
        features,
        crs,
      }
    } finally {
      dataset.close()
    }
  }

  /**
   * Valida o schema de um arquivo GPKG parseado contra o schema do workgroup
   * @param parsedData Dados parseados do GPKG
   * @param workgroupId Identificador do workgroup/GT
   * @returns Resultado da validação
   */
  validateSchema(parsedData: ParsedGpkgData, workgroupId: WorkgroupId): ValidationResult {
    const errors: GpkgValidationError[] = []
    const schema = getWorkgroupSchema(workgroupId)
    const workgroupName = getWorkgroupName(workgroupId)
    const fieldNames = new Set(parsedData.fields.map((field) => field.name))

    // Validar campos obrigatórios
    const missingFields = schema.requiredFields.filter((field) => !fieldNames.has(field))
    if (missingFields.length > 0) {
      errors.push({
        type: GpkgErrorType.MISSING_FIELD,
        message: `Campos obrigatórios ausentes (GT ${workgroupName}): ${missingFields.join(', ')}`,
        details: { missingFields, workgroup: workgroupId },
      })
    }

    // Validar tipo de geometria
    const normalizedGeometryType = parsedData.geometryType.toLowerCase()
    const expectedGeometryType = schema.geometryType.toLowerCase()
    if (normalizedGeometryType !== expectedGeometryType) {
      errors.push({
        type: GpkgErrorType.INVALID_GEOMETRY,
        message: `Tipo de geometria inválido (GT ${workgroupName}): ${parsedData.geometryType}. Esperado: ${schema.geometryType}`,
        details: { geometryType: parsedData.geometryType, expected: schema.geometryType, workgroup: workgroupId },
      })
    }

    // Validar layer name
    if (parsedData.layerName !== schema.layerName) {
      errors.push({
        type: GpkgErrorType.MISSING_FIELD,
        message: `Layer incorreta (GT ${workgroupName}): "${parsedData.layerName}". Esperado: "${schema.layerName}"`,
        details: { layerName: parsedData.layerName, expected: schema.layerName, workgroup: workgroupId },
      })
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * Valida o CRS de um arquivo GPKG contra os CRS aceitos pelo workgroup
   * @param parsedData Dados parseados do GPKG
   * @param workgroupId Identificador do workgroup/GT
   * @returns Resultado da validação
   */
  validateCrs(parsedData: ParsedGpkgData, workgroupId: WorkgroupId): ValidationResult {
    const errors: GpkgValidationError[] = []
    const schema = getWorkgroupSchema(workgroupId)
    const workgroupName = getWorkgroupName(workgroupId)
    const crsInfo = parsedData.crs

    if (!crsInfo) {
      const acceptedCrsStr = schema.acceptedCRS.map((c) => `EPSG:${c}`).join(' ou ')
      errors.push({
        type: GpkgErrorType.INVALID_CRS,
        message: `Layer sem CRS definido (GT ${workgroupName}). Esperado: ${acceptedCrsStr}`,
        details: { workgroup: workgroupId },
      })

      return { valid: false, errors }
    }

    const epsg = crsInfo.epsg

    // Verificar se EPSG está na lista de aceitos
    if (typeof epsg === 'number' && schema.acceptedCRS.includes(epsg)) {
      return { valid: true, errors: [] }
    }

    // Se EPSG não está na lista, tentar validar via WKT
    if (crsInfo.wkt) {
      try {
        const source = new gdal.SpatialReference(crsInfo.wkt)
        source.autoIdentifyEPSG()

        // Verificar contra cada CRS aceito
        for (const acceptedEpsg of schema.acceptedCRS) {
          const target = gdal.SpatialReference.fromEPSG(acceptedEpsg)
          if (source.isSameGeogCS(target) || source.isSame(target)) {
            return { valid: true, errors: [] }
          }
        }
      } catch (error) {
        errors.push({
          type: GpkgErrorType.INVALID_CRS,
          message: `Falha ao interpretar CRS do arquivo (GT ${workgroupName})`,
          details: { error: (error as Error).message, workgroup: workgroupId },
        })
        return { valid: false, errors }
      }
    }

    // CRS não aceito - criar mensagem de erro informativa
    const acceptedCrsStr = schema.acceptedCRS.map((c) => {
      if (c === 4674) return 'EPSG:4674 (SIRGAS 2000)'
      if (c === 4326) return 'EPSG:4326 (WGS84)'
      return `EPSG:${c}`
    }).join(' ou ')

    const detectedCrs = epsg ? `EPSG:${epsg}` : 'desconhecido'

    errors.push({
      type: GpkgErrorType.INVALID_CRS,
      message: `CRS incompatível: ${detectedCrs}. GT ${workgroupName} aceita ${acceptedCrsStr}. A conversão será feita automaticamente durante a importação.`,
      details: { detectedCrs, acceptedCRS: schema.acceptedCRS, workgroup: workgroupId },
    })

    return { valid: false, errors }
  }

  /**
   * Valida a contagem de features contra o esperado pelo workgroup
   * @param parsedData Dados parseados do GPKG
   * @param workgroupId Identificador do workgroup/GT
   * @returns Resultado da validação
   */
  validateFeatureCount(parsedData: ParsedGpkgData, workgroupId: WorkgroupId): ValidationResult {
    const errors: GpkgValidationError[] = []
    const schema = getWorkgroupSchema(workgroupId)
    const workgroupName = getWorkgroupName(workgroupId)
    const featureCount = parsedData.features.length

    const { min, max, target } = schema.expectedFeatureCount

    // Se a contagem esperada for 0, não validar
    if (target === 0) {
      return { valid: true, errors: [] }
    }

    // Verificar se está dentro da tolerância
    if (featureCount < min || featureCount > max) {
      const message = featureCount < min
        ? `Contagem de features muito baixa (GT ${workgroupName}): ${featureCount}. Esperado: ~${target} (mínimo ${min}). Verifique se a cobertura do estado do Paraná está completa.`
        : `Contagem de features muito alta (GT ${workgroupName}): ${featureCount}. Esperado: ~${target} (máximo ${max}). Verifique se não há features duplicadas.`

      errors.push({
        type: GpkgErrorType.INVALID_FEATURE_COUNT,
        message,
        details: {
          count: featureCount,
          expected: target,
          min,
          max,
          workgroup: workgroupId,
        },
      })
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * Valida códigos IBGE para workgroups que usam municípios (Saúde, Litoral)
   * @param features Features do GPKG
   * @param workgroupId Identificador do workgroup/GT
   * @returns Resultado da validação
   */
  validateCodigoIBGE(features: GeoJSONFeature[], workgroupId: WorkgroupId): ValidationResult {
    const errors: GpkgValidationError[] = []
    const workgroupName = getWorkgroupName(workgroupId)
    const seenCodigos = new Set<string>()

    // Determinar campo de código baseado no workgroup
    const codigoFieldName = workgroupId === 'litoral' ? 'CD_MUN' : 'Codigo'

    features.forEach((feature, index) => {
      const codigoRaw = feature.properties[codigoFieldName]
      const codigo = typeof codigoRaw === 'string' ? codigoRaw : String(codigoRaw ?? '')

      // Validar existência
      if (!codigo || codigo === 'undefined' || codigo === 'null') {
        errors.push({
          type: GpkgErrorType.INVALID_CODE_FORMAT,
          featureId: index,
          message: `Código IBGE ausente ou inválido na feature #${index} (campo ${codigoFieldName}, GT ${workgroupName})`,
          details: { value: codigoRaw, workgroup: workgroupId, field: codigoFieldName },
        })
        return
      }

      // Validar formato (6 ou 7 dígitos - aceita com ou sem dígito verificador)
      if (!/^\d{6,7}$/.test(codigo)) {
        errors.push({
          type: GpkgErrorType.INVALID_CODE_FORMAT,
          featureId: codigo,
          message: `Código IBGE com formato inválido (GT ${workgroupName}): "${codigo}". Esperado: 6 ou 7 dígitos numéricos.`,
          details: { value: codigo, workgroup: workgroupId },
        })
        return
      }

      // Validar que começa com 41 (Paraná)
      if (!codigo.startsWith('41')) {
        errors.push({
          type: GpkgErrorType.INVALID_CODE_FORMAT,
          featureId: codigo,
          message: `Código IBGE não pertence ao Paraná (GT ${workgroupName}): "${codigo}". Códigos do Paraná começam com "41".`,
          details: { value: codigo, workgroup: workgroupId },
        })
        return
      }

      // Validar unicidade
      if (seenCodigos.has(codigo)) {
        errors.push({
          type: GpkgErrorType.DUPLICATE_ID,
          featureId: codigo,
          message: `Código IBGE duplicado encontrado (GT ${workgroupName}): ${codigo}`,
          details: { workgroup: workgroupId },
        })
      } else {
        seenCodigos.add(codigo)
      }
    })

    return { valid: errors.length === 0, errors }
  }

  /**
   * Valida valores das features contra o schema do workgroup
   * @param features Features do GPKG
   * @param workgroupId Identificador do workgroup/GT
   * @returns Resultado da validação
   */
  validateValues(features: GeoJSONFeature[], workgroupId: WorkgroupId): ValidationResult {
    const errors: GpkgValidationError[] = []
    const schema = getWorkgroupSchema(workgroupId)
    const workgroupName = getWorkgroupName(workgroupId)
    const numericFields = schema.numericFields ?? []

    // Para cada feature, validar campos numéricos
    features.forEach((feature, index) => {
      const featureId = this.extractFeatureId(feature, index)

      numericFields.forEach((field) => {
        const value = feature.properties[field]

        // Permitir null/undefined
        if (value === null || value === undefined) {
          return
        }

        // Validar tipo numérico
        if (typeof value !== 'number' || !Number.isFinite(value)) {
          errors.push({
            type: GpkgErrorType.INVALID_VALUE_TYPE,
            field,
            featureId,
            message: `Valor inválido no campo ${field} (GT ${workgroupName}): ${value}. Esperado: número.`,
            details: { value, workgroup: workgroupId },
          })
        }
      })
    })

    return { valid: errors.length === 0, errors }
  }

  /**
   * Valida geometrias das features
   * @param features Features do GPKG
   * @param workgroupId Identificador do workgroup/GT
   * @returns Resultado da validação
   */
  validateGeometries(features: GeoJSONFeature[], workgroupId: WorkgroupId): ValidationResult {
    const errors: GpkgValidationError[] = []
    const workgroupName = getWorkgroupName(workgroupId)

    for (let index = 0; index < features.length; index += 1) {
      if (errors.length >= MAX_GEOMETRY_ERRORS) {
        break
      }

      const feature = features[index]
      const featureId = this.extractFeatureId(feature, index)

      if (!feature.geometry) {
        errors.push({
          type: GpkgErrorType.INVALID_GEOMETRY,
          featureId,
          message: `Feature sem geometria (GT ${workgroupName})`,
          details: { workgroup: workgroupId },
        })
        continue
      }

      try {
        const geometry = gdal.Geometry.fromGeoJson(feature.geometry)

        if (!geometry || !geometry.isValid()) {
          errors.push({
            type: GpkgErrorType.INVALID_GEOMETRY,
            featureId,
            message: `Geometria inválida detectada (GT ${workgroupName}): self-intersection ou topologia incorreta`,
            details: { workgroup: workgroupId },
          })
        } else if (!this.isAllowedGeometryType(geometry)) {
          errors.push({
            type: GpkgErrorType.INVALID_GEOMETRY,
            featureId,
            message: `Tipo de geometria inesperado (GT ${workgroupName}): ${geometry.name}`,
            details: { geometry: geometry.name, workgroup: workgroupId },
          })
        }
      } catch (error) {
        errors.push({
          type: GpkgErrorType.INVALID_GEOMETRY,
          featureId,
          message: `Erro ao validar geometria (GT ${workgroupName})`,
          details: { error: (error as Error).message, workgroup: workgroupId },
        })
      }
    }

    return { valid: errors.length === 0, errors }
  }

  /**
   * Valida arquivo GPKG completo para um workgroup específico
   * @param filePath Caminho para o arquivo GPKG
   * @param workgroupId Identificador do workgroup/GT
   * @param layerName Nome da layer (opcional)
   * @returns Resultado da validação completa
   */
  async validateFile(
    filePath: string,
    workgroupId: WorkgroupId,
    layerName?: string
  ): Promise<{
    parsedData: ParsedGpkgData
    summary: ValidationSummary
    result: ValidationResult
  }> {
    const parsedData = await this.parseGpkg(filePath, workgroupId, layerName)

    // Validações em ordem (conforme especificado na story)
    const schema = this.validateSchema(parsedData, workgroupId)
    const crs = this.validateCrs(parsedData, workgroupId)
    const featureCount = this.validateFeatureCount(parsedData, workgroupId)
    const geometry = this.validateGeometries(parsedData.features, workgroupId)
    const values = this.validateValues(parsedData.features, workgroupId)

    // Validações específicas por workgroup
    let codigoIBGE: ValidationResult = { valid: true, errors: [] }
    if (workgroupId === 'saude' || workgroupId === 'litoral') {
      codigoIBGE = this.validateCodigoIBGE(parsedData.features, workgroupId)
    }

    const allErrors = [
      ...schema.errors,
      ...crs.errors,
      ...featureCount.errors,
      ...geometry.errors,
      ...values.errors,
      ...codigoIBGE.errors,
    ]

    return {
      parsedData,
      summary: { schema, crs, geometry, values },
      result: {
        valid: allErrors.length === 0,
        errors: allErrors,
      },
    }
  }

  /**
   * Formata erros de validação para exibição amigável
   * @param errors Lista de erros de validação
   * @returns Lista de mensagens formatadas
   */
  formatErrors(errors: GpkgValidationError[]): string[] {
    return errors.map((error) => {
      // A mensagem já inclui o contexto do workgroup, então apenas formatamos
      switch (error.type) {
        case GpkgErrorType.MISSING_FIELD:
          return error.details?.missingFields
            ? `Campos ausentes: ${(error.details.missingFields as string[]).join(', ')}`
            : error.message

        case GpkgErrorType.INVALID_CRS:
          return error.message // Já inclui contexto completo

        case GpkgErrorType.INVALID_FEATURE_COUNT:
          return error.message // Já inclui contexto completo

        case GpkgErrorType.INVALID_CODE_FORMAT:
        case GpkgErrorType.DUPLICATE_ID:
          return error.featureId ? `[${error.featureId}] ${error.message}` : error.message

        case GpkgErrorType.INVALID_GEOMETRY:
        case GpkgErrorType.INVALID_VALUE_TYPE:
          return error.featureId ? `[${error.featureId}] ${error.message}` : error.message

        default:
          return error.message
      }
    })
  }

  private async ensureReadable(filePath: string): Promise<void> {
    try {
      await access(filePath, fsConstants.R_OK)
    } catch (error) {
      throw new Error(`Arquivo não pode ser lido: ${(error as Error).message}`)
    }
  }

  private collectFields(layer: Layer): ParsedGpkgField[] {
    return layer.fields
      .map((field) => ({
        name: field.name,
        type: (field as unknown as { type?: string }).type ?? 'unknown',
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  private collectFeatures(layer: Layer, start: number): GeoJSONFeature[] {
    const features: GeoJSONFeature[] = []

    for (const feature of layer.features) {
      if (this.clock() - start > MAX_OPERATION_DURATION_MS) {
        throw new GpkgParserTimeoutError()
      }

      const properties = feature.fields.toObject() as Record<string, unknown>
      const geometryObject = feature.getGeometry()
      const geojson = geometryObject ? (geometryObject.toObject() as GeoJSONGeometry) : null

      features.push({
        type: 'Feature',
        id: feature.fid,
        properties,
        geometry: geojson,
      })

      feature.destroy()
    }

    return features
  }

  private extractCrs(srs: SpatialReference | null): ParsedGpkgCrs | undefined {
    if (!srs) {
      return undefined
    }

    try {
      srs.autoIdentifyEPSG()
    } catch {
      // ignore - alguns CRS não suportam auto-identify
    }

    let authority: string | undefined
    let code: string | undefined

    try {
      authority = srs.getAuthorityName(null) ?? undefined
      code = srs.getAuthorityCode(null) ?? undefined
    } catch {
      authority = undefined
      code = undefined
    }

    try {
      if (!authority || !code) {
        const geogAuth = srs.getAuthorityName('GEOGCS') ?? undefined
        const geogCode = srs.getAuthorityCode('GEOGCS') ?? undefined

        authority = authority ?? geogAuth
        code = code ?? geogCode
      }
    } catch {
      // ignore
    }

    let epsg: number | undefined
    if (code) {
      const parsed = Number.parseInt(code, 10)
      if (!Number.isNaN(parsed)) {
        epsg = parsed
      }
    }

    let wkt: string | undefined
    try {
      wkt = srs.toWKT()
    } catch {
      wkt = undefined
    }

    return {
      authority,
      code,
      epsg,
      wkt,
    }
  }

  private isAllowedGeometryType(geometry: gdal.Geometry): boolean {
    return VALID_GEOMETRIES.includes(this.normalizeGeometryType(geometry.name))
  }

  private normalizeGeometryType(rawType: string): string {
    return rawType.trim().replace(/\s+/g, '').toLowerCase()
  }

  private extractFeatureId(feature: GeoJSONFeature, index: number): string | number {
    if (feature.properties.HYBAS_ID) {
      return feature.properties.HYBAS_ID as string
    }

    if (feature.id !== undefined) {
      return feature.id
    }

    return index
  }
}
