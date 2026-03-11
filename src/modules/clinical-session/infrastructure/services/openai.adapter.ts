import { Injectable } from '@nestjs/common'
import OpenAI from 'openai'
import { env } from '../../../../config/env'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatCompletionOptions {
  model?: string
  messages: ChatMessage[]
  responseFormat?: 'text' | 'json_object'
  maxTokens?: number
  temperature?: number
}

export interface ChatCompletionResult {
  content: string
  tokensUsed: number
}

@Injectable()
export class OpenAiAdapter {
  private readonly client: OpenAI

  constructor() {
    this.client = new OpenAI({ apiKey: env.OPENAI_API_KEY })
  }

  async complete(options: ChatCompletionOptions): Promise<ChatCompletionResult> {
    const response = await this.client.chat.completions.create({
      model: options.model ?? 'gpt-4o',
      messages: options.messages,
      max_tokens: options.maxTokens,
      temperature: options.temperature ?? 0.7,
      ...(options.responseFormat === 'json_object'
        ? { response_format: { type: 'json_object' as const } }
        : {}),
    })

    const choice = response.choices[0]
    const content = choice?.message?.content ?? ''
    const tokensUsed = response.usage?.total_tokens ?? 0

    return { content, tokensUsed }
  }
}
