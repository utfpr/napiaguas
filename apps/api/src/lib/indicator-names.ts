/**
 * Mapeamento de códigos de indicadores para nomes legíveis em português
 * Atualizado conforme solicitação do usuário
 */
export const INDICATOR_NAME_MAP: Record<string, string> = {
  // Índice principal
  IVCaq: 'Índice de Vulnerabilidade Climática Aquática',

  // Subíndices
  Exposicao: 'Exposição',
  Sensibilidade: 'Sensibilidade',
  CapacidadeAdaptativa: 'Capacidade Adaptativa',

  // Indicadores já corretos
  Agricultura: 'Agricultura',
  Pastagens: 'Pastagens',
  Silvicultura: 'Silvicultura',

  // Indicadores que precisam de correção
  Area_urbana: 'Área urbana',
  Mineracao: 'Mineração',
  Precipitacao_var: 'Variação da precipitação',
  Tmax_var: 'Variação da temperatura máxima',
  IFP_norm: 'Índice de Fragmentação Ponderada',
  disF_peixes: 'Dispersão Funcional de Peixes',
  disF_bentos: 'Dispersão Funcional de Macroinvertebrados Aquáticos',
  Prop_MacEPT: 'Macroinvertebrados EPT (%)',
  Prop_MacNN: 'Macroinvertebrados Não nativos (%)',
  Prop_peixesNN: 'Peixes não nativos (%)',
  Prop_peixesEnd: 'Peixes endêmicos (%)',
  Prop_peixesAm: 'Peixes ameaçados (%)',
  Prop_peixesMigr: 'Peixes migradores (%)',
  redF_bentos: 'Redundância Funcional de Macroinvertebrados Aquáticos',
  ICL: 'Índice de Conectividade Longitudinal',
  redF_peixes: 'Redundância Funcional de Peixes',
  Prop_Bentos_N: 'Macroinvertebrados Aquáticos Nativos (%)',
  Prop_Bent_N: 'Macroinvertebrados Aquáticos Nativos (%)',
  UC_perc: 'Unidades de conservação (%)',
  Prop_Peixes_N: 'Peixes Nativos (%)',
  Prop_Peix_N: 'Peixes Nativos (%)',
}

/**
 * Retorna o nome legível do indicador ou null se não houver mapeamento
 * Isso permite que o repositório use o nome do banco de dados como fallback
 */
export function getIndicatorDisplayName(code: string): string | null {
  return INDICATOR_NAME_MAP[code] ?? null
}

/**
 * Aplica o mapeamento de nomes em um objeto que contém um campo 'name' e 'code'
 */
export function applyIndicatorNameMapping<T extends { code: string; name: string }>(
  item: T,
): T {
  return {
    ...item,
    name: getIndicatorDisplayName(item.code) || item.name,
  }
}
