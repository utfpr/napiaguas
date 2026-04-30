/**
 * Identificador de workgroup/GT para parsing e validação de GPKG
 */
export type WorkgroupId = 'agua-doce' | 'saude' | 'litoral' | 'transportes'

export enum GpkgErrorType {
  MISSING_FIELD = 'MISSING_FIELD',
  INVALID_GEOMETRY = 'INVALID_GEOMETRY',
  INVALID_CRS = 'INVALID_CRS',
  DUPLICATE_ID = 'DUPLICATE_ID',
  INVALID_VALUE_TYPE = 'INVALID_VALUE_TYPE',
  INVALID_FEATURE_COUNT = 'INVALID_FEATURE_COUNT',
  INVALID_CODE_FORMAT = 'INVALID_CODE_FORMAT',
  TIMEOUT = 'TIMEOUT',
  IO_ERROR = 'IO_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

export interface GpkgValidationError {
  type: GpkgErrorType;
  /**
   * Campo associado ao erro (quando aplicável)
   */
  field?: string;
  /**
   * Identificador da feature impactada (HYBAS_ID ou fid)
   */
  featureId?: string | number;
  /**
   * Mensagem amigável descrevendo o problema encontrado
   */
  message: string;
  /**
   * Detalhes adicionais estruturados para consumo pelo frontend
   */
  details?: Record<string, unknown>;
}

export interface ValidationResult {
  valid: boolean;
  errors: GpkgValidationError[];
}
