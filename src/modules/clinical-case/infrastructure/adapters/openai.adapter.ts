import { Injectable } from '@nestjs/common'
import OpenAI from 'openai'
import { env } from '../../../../config/env'

@Injectable()
export class OpenAiAdapter {
  private readonly client: OpenAI

  constructor() {
    this.client = new OpenAI({ apiKey: env.OPENAI_API_KEY })
  }

  async chatCompletion(params: {
    systemPrompt: string
    userPrompt: string
    model?: string
    temperature?: number
    maxTokens?: number
  }): Promise<string> {
    const completion = await this.client.chat.completions.create(
      {
        model: params.model ?? 'gpt-4o',
        temperature: params.temperature ?? 0.9,
        max_tokens: params.maxTokens ?? 2000,
        messages: [
          { role: 'system', content: params.systemPrompt },
          { role: 'user', content: params.userPrompt },
        ],
      },
      { signal: AbortSignal.timeout(30_000) },
    )

    const content = completion.choices[0]?.message?.content
    if (!content) {
      throw new Error('Empty response from OpenAI')
    }

    return content
  }
}
