import { Injectable } from '@nestjs/common'
import { OpenAiAdapter } from './openai.adapter'

export interface ExamExtractionResult {
  slugs: string[]
  wasExplicitRequest: boolean
}

@Injectable()
export class ExamExtractorService {
  constructor(private readonly openAi: OpenAiAdapter) {}

  async extract(
    userMessage: string,
    availableExams: Array<{ slug: string; name: string }>,
  ): Promise<ExamExtractionResult> {
    const examList = availableExams.map((e) => `${e.slug} (${e.name})`).join(', ')

    const systemPrompt =
      `Você extrai pedidos de exame EXPLICITAMENTE solicitados em mensagens médicas. ` +
      `Retorne APENAS JSON: { "requested": boolean, "slugs": string[] }. ` +
      `"requested": true se o médico pediu EXPLICITAMENTE algum exame ou procedimento na mensagem, ` +
      `MESMO QUE o exame solicitado não esteja na lista de disponíveis. ` +
      `"requested": false SOMENTE se a mensagem não contém nenhum pedido de exame ou procedimento. ` +
      `"slugs": apenas os slugs da lista disponível que correspondam EXATAMENTE ao que foi pedido. ` +
      `Exames disponíveis (slug e nome legível): ${examList}. ` +
      `REGRA CRÍTICA: extraia SOMENTE exames que o médico pediu diretamente na mensagem. ` +
      `NUNCA infira exames baseado no quadro clínico descrito ou em raciocínio diagnóstico. ` +
      `Se o médico pediu um exame que NÃO está na lista disponível: { "requested": true, "slugs": [] }. ` +
      `Se não houve pedido explícito de exame: { "requested": false, "slugs": [] }.`

    try {
      const result = await this.openAi.complete({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        responseFormat: 'json_object',
        temperature: 0,
      })

      const parsed = JSON.parse(result.content) as { requested?: unknown; slugs?: unknown }

      const wasExplicitRequest = parsed.requested === true

      if (!Array.isArray(parsed.slugs)) {
        return { slugs: [], wasExplicitRequest }
      }

      const slugSet = new Set(availableExams.map((e) => e.slug))
      const validSlugs = parsed.slugs
        .filter((s): s is string => typeof s === 'string' && slugSet.has(s))

      return { slugs: validSlugs, wasExplicitRequest }
    } catch {
      return { slugs: [], wasExplicitRequest: false }
    }
  }
}
