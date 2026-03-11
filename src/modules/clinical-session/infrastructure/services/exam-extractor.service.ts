import { Injectable } from '@nestjs/common'
import { OpenAiAdapter } from './openai.adapter'

export interface ExamExtractionResult {
  slugs: string[]
}

@Injectable()
export class ExamExtractorService {
  constructor(private readonly openAi: OpenAiAdapter) {}

  async extract(userMessage: string, availableSlugs: string[]): Promise<ExamExtractionResult> {
    const slugList = availableSlugs.join(', ')

    const systemPrompt =
      `Você extrai pedidos de exame de mensagens médicas. ` +
      `Retorne APENAS JSON: { "slugs": string[] }. ` +
      `Slugs disponíveis: ${slugList}. ` +
      `Se nenhum reconhecido, retorne { "slugs": [] }`

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

      const parsed = JSON.parse(result.content) as { slugs?: unknown }

      if (!Array.isArray(parsed.slugs)) {
        return { slugs: [] }
      }

      const validSlugs = parsed.slugs
        .filter((s): s is string => typeof s === 'string' && availableSlugs.includes(s))

      return { slugs: validSlugs }
    } catch {
      return { slugs: [] }
    }
  }
}
