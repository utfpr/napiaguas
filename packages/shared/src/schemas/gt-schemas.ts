import { z } from 'zod'

import { FeatureSchema, GeometrySchema } from './geometry.schema'
import { GTType } from '../types/gt-common.types'

const codigoIbgeSchema = z
  .string()
  .regex(/^\d{6,7}$/, 'código IBGE deve conter 6 ou 7 dígitos numéricos')

const stringArraySchema = z.array(z.string().min(1))

const baseIndicadoresSchema = z.object({
  indice_integrado: z
    .number()
    .min(0, 'indice_integrado deve ser no mínimo 0')
    .max(1, 'indice_integrado deve ser no máximo 1')
    .optional(),
  confiabilidade_dados: z
    .number()
    .min(0, 'confiabilidade_dados deve ser no mínimo 0')
    .max(1, 'confiabilidade_dados deve ser no máximo 1')
    .optional(),
})

const baseMunicipioSchema = z.object({
  id: z.string().uuid('id deve ser um UUID válido'),
  nome: z.string().min(1, 'nome é obrigatório'),
  codigo_ibge: codigoIbgeSchema,
  geometria: GeometrySchema,
  feature: FeatureSchema.optional(),
  fontes_dados: stringArraySchema.optional(),
})

const faixaCosteiraPropertiesSchema = z.object({
  municipioId: z.string().min(1, 'municipioId é obrigatório'),
  risco_inundacao: z
    .number()
    .min(0, 'risco_inundacao da faixa costeira não pode ser menor que 0')
    .max(1, 'risco_inundacao da faixa costeira não pode ser maior que 1'),
})

const faixaCosteiraSchema = FeatureSchema.extend({
  properties: faixaCosteiraPropertiesSchema,
})

const gtLitoralIndicadoresSchema = baseIndicadoresSchema.extend({
  elevacao_costeira_m: z.number({
    required_error: 'elevacao_costeira_m é obrigatório',
  }),
  risco_inundacao: z
    .number({
      required_error: 'risco_inundacao é obrigatório',
    })
    .min(0, 'risco_inundacao não pode ser menor que 0')
    .max(1, 'risco_inundacao não pode ser maior que 1'),
  populacao_zona_risco: z
    .number({
      required_error: 'populacao_zona_risco é obrigatório',
    })
    .int('populacao_zona_risco deve ser um número inteiro')
    .min(0, 'populacao_zona_risco não pode ser negativo'),
  indice_resiliencia_costeira: z
    .number()
    .min(0, 'indice_resiliencia_costeira não pode ser menor que 0')
    .max(1, 'indice_resiliencia_costeira não pode ser maior que 1')
    .optional(),
})

const gtSaudeIndicadoresSchema = baseIndicadoresSchema.extend({
  cobertura_atencao_basica_percentual: z
    .number({
      required_error: 'cobertura_atencao_basica_percentual é obrigatório',
    })
    .min(0, 'cobertura_atencao_basica_percentual deve ser no mínimo 0')
    .max(100, 'cobertura_atencao_basica_percentual deve ser no máximo 100'),
  indice_vulnerabilidade_saude: z
    .number({
      required_error: 'indice_vulnerabilidade_saude é obrigatório',
    })
    .min(0, 'indice_vulnerabilidade_saude não pode ser menor que 0')
    .max(1, 'indice_vulnerabilidade_saude não pode ser maior que 1'),
  internacoes_sensiveis_por_100k: z
    .number({
      required_error: 'internacoes_sensiveis_por_100k é obrigatório',
    })
    .min(0, 'internacoes_sensiveis_por_100k não pode ser negativo'),
  cobertura_vacinacao_infantil_percentual: z
    .number()
    .min(0, 'cobertura_vacinacao_infantil_percentual não pode ser menor que 0')
    .max(100, 'cobertura_vacinacao_infantil_percentual não pode ser maior que 100')
    .optional(),
})

export const gtLitoralMunicipioSchema = baseMunicipioSchema.extend({
  gt_type: z.literal(GTType.LITORAL),
  indicadores: gtLitoralIndicadoresSchema,
  faixa_costeira: faixaCosteiraSchema.optional(),
})

export const gtSaudeMunicipioSchema = baseMunicipioSchema.extend({
  gt_type: z.literal(GTType.SAUDE),
  regional_saude: z.string().min(1, 'regional_saude é obrigatório'),
  populacao_total: z
    .number()
    .int('populacao_total deve ser um número inteiro')
    .min(0, 'populacao_total não pode ser negativo')
    .optional(),
  rede_referencia: stringArraySchema.optional(),
  indicadores: gtSaudeIndicadoresSchema,
})

export type GTLitoralMunicipioSchema = z.infer<typeof gtLitoralMunicipioSchema>
export type GTSaudeMunicipioSchema = z.infer<typeof gtSaudeMunicipioSchema>
