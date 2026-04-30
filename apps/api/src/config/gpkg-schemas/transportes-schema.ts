import type { GpkgWorkgroupSchema } from './types'

/**
 * Schema de validação e mapeamento para GT Transportes
 *
 * Estrutura do GPKG:
 * - Layer: sf_INDICE_Infraestrutura
 * - CRS: EPSG:31982 (SIRGAS 2000 / UTM zone 22S) → convertido para EPSG:4326
 * - 2.328 trechos rodoviários (LineString)
 * - 54 indicadores (1 índice + 5 subíndices + 15 indicadores + 33 variáveis)
 */

/**
 * Mapeamento entre nomes de colunas do GPKG e nomes dos indicadores no banco.
 *
 * As colunas do GPKG usam códigos curtos (ex: R50mm, CWD, IVTR),
 * mas os indicadores no banco têm nomes descritivos completos.
 *
 * Este mapeamento garante que os valores sejam associados corretamente.
 */
export const TRANSPORTES_COLUMN_MAPPING: Record<string, string> = {
  // Nível 1: Índice principal
  IVTR: 'Índice de Vulnerabilidade do Transporte Rodoviário',

  // Nível 2: Subíndices
  IVECDT: 'Índice de Vulnerabilidade de Exposição Climática para deslizamentos de terra',
  IVECI: 'Índice de Vulnerabilidade de Exposição Climática de inundação',
  IVSADT: 'Índice de Vulnerabilidade de Sensibilidade do ambiente para deslizamento de terra',
  IVSAI: 'Índice de Vulnerabilidade de Sensibilidade do ambiente para inundação',
  ICASV: 'Índice de Capacidade de adaptação socioeconômica frente às vulnerabilidades',

  // Nível 3: Indicadores - IVECDT
  R50mm: 'Número de dias com chuva ≥ 50mm',
  Rx5Day: 'Chuva máxima acumulada em cinco dias',
  CWD: 'Número máximo de dias consecutivos com chuva (Deslizamento)', // CWD usado em IVECDT
  R_media_anual: 'Precipitação média anual',

  // Nível 3: Indicadores - IVECI
  R20mm: 'Número de dias com chuva ≥ 20mm',
  Rx1Day: 'Chuva máxima acumulada em um dia',
  // CWD: mapeado acima para IVECDT - precisamos criar entrada separada para IVECI

  // Nível 3: Indicadores - IVSADT
  Grau_declv: 'Grau de declividade (Deslizamento)', // Usado em IVSADT (sem variáveis de nível 4)
  Nota_solo: 'Uso do solo', // Coluna Nota_solo → Indicador "Uso do solo" (7 variáveis de USO DO SOLO)
  Nota_Uso: 'Tipo de solo', // Coluna Nota_Uso → Indicador "Tipo de solo" (11 variáveis de TIPOS DE SOLO - compartilhado com IVSAI)

  // Nível 3: Indicadores - IVSAI
  // Grau_declv mapeia para "Grau de declividade (Inundação)" em IVSAI (COM 1 variável: Declividade)
  Densidade_rodovias: 'Densidade de estradas',
  // Nota_Uso: compartilhado com IVSADT (mesma coluna, mesmo indicador)

  // Nível 3: Indicadores - ICASV
  VDM_media: 'Volume médio diário de tráfego',
  Densidade_populacional: 'Densidade populacional',
  Polo_gerador: 'Acesso prioritário de polos geradores',

  // Nível 4: Variáveis - Declividade (filho de Grau_declv em IVSADT e IVSAI)
  Declividade: 'Declividade',

  // Nível 4: Variáveis - Uso do solo (filhos de Nota_solo em IVSADT)
  // NOTA: Nota_solo tem 7 variáveis de USO DO SOLO
  Vegetacao_florestal: 'Vegetação florestal',
  Veg_campestre_umida: 'Vegetação campestre úmida',
  Silvicultura: 'Silvicultura',
  Area_descoberta: 'Área descoberta',
  Pastagem: 'Pastagem',
  Area_agricola: 'Área agrícola',
  Area_artificial: 'Área artificial',

  // Nível 4: Variáveis - Tipos de solo (filhos de Nota_Uso em IVSADT e IVSAI - COMPARTILHADOS)
  // NOTA: Nota_Uso tem 11 variáveis de TIPOS DE SOLO compartilhadas entre IVSADT e IVSAI
  Neossolo: 'Neossolo',
  Latossolo: 'Latossolo',
  Solo_sem_nome: 'Solo sem nome',
  Nitossolo: 'Nitossolo',
  Argissolo: 'Argissolo',
  Gleissolo: 'Gleissolo',
  Organossolo: 'Organossolo',
  Cambissolo: 'Cambissolo',
  Espodossolo: 'Espodossolo',
  Afloramento_de_rocha: 'Afloramento de rocha',
  Chernossolo: 'Chernossolo',

  // Nível 4: Variáveis - Volume médio diário
  VMDa_C: 'Volume Médio Diário - Carros',
  VMDa_D: 'Volume Médio Diário - Caminhões',
}

export const TRANSPORTES_SCHEMA: GpkgWorkgroupSchema = {
  workgroupId: 'transportes',
  layerName: 'sf_INDICE_Infraestrutura',
  geometryType: 'LineString',
  acceptedCRS: [4326, 31982], // EPSG:4326 (WGS84) e EPSG:31982 (SIRGAS 2000 / UTM zone 22S)
  expectedFeatureCount: { target: 2328, min: 1000, max: 5000 },
  identifierFields: ['Trecho'],
  requiredFields: ['Trecho', 'Rod_num'],
}
