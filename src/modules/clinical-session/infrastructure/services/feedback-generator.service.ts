import { Injectable } from '@nestjs/common'
import { OpenAiAdapter } from './openai.adapter'
import { MessageTurn } from '../../domain/entities/message-turn.entity'
import { DomainException } from '../../../../errors/domain-exception'

export interface FeedbackGeneratorInput {
  correctDiagnosis: string
  expectedManagement: string
  keyFindings: string[]
  keyExams: string[]
  submittedDiagnosis: string
  submittedManagement: string
  requestedExams: string[]
  missedKeyExams: string[]
  messages: MessageTurn[]
}

export interface FeedbackDimension {
  score: number
  analysis: string
}

export interface FeedbackResult {
  score_total: number
  correct_diagnosis: string
  dimensions: {
    history_taking: FeedbackDimension
    differential: FeedbackDimension
    diagnosis: FeedbackDimension
    exams: FeedbackDimension
    management: FeedbackDimension
  }
}

@Injectable()
export class FeedbackGeneratorService {
  constructor(private readonly openAi: OpenAiAdapter) {}

  async generate(input: FeedbackGeneratorInput): Promise<FeedbackResult> {
    const conversationSummary = input.messages
      .filter((m) => m.role !== 'system')
      .slice(-30)
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n')

    const systemPrompt =
      'Você é um professor de medicina avaliando um estudante em simulação clínica. ' +
      'Avalie de forma construtiva. Retorne APENAS JSON válido.'

    const userPrompt = `Avalie o desempenho do estudante nesta simulação clínica.

CASO CORRETO:
- Diagnóstico: ${input.correctDiagnosis}
- Conduta esperada: ${input.expectedManagement}
- Achados-chave: ${input.keyFindings.join(', ')}
- Exames-chave necessários: ${input.keyExams.join(', ')}

DESEMPENHO DO ESTUDANTE:
- Diagnóstico submetido: ${input.submittedDiagnosis}
- Conduta submetida: ${input.submittedManagement}
- Exames solicitados: ${input.requestedExams.join(', ')}
- Exames-chave perdidos: ${input.missedKeyExams.join(', ')}

CONVERSA (últimas mensagens):
${conversationSummary}

Retorne JSON com esta estrutura exata:
{
  "score_total": number (0-100),
  "correct_diagnosis": "${input.correctDiagnosis}",
  "dimensions": {
    "history_taking": { "score": number (0-100), "analysis": string },
    "differential": { "score": number (0-100), "analysis": string },
    "diagnosis": { "score": number (0-100), "analysis": string },
    "exams": { "score": number (0-100), "analysis": string },
    "management": { "score": number (0-100), "analysis": string }
  }
}`

    try {
      const result = await this.openAi.complete({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        responseFormat: 'json_object',
        temperature: 0.3,
      })

      const parsed = JSON.parse(result.content) as FeedbackResult

      const examBaseScore = parsed.dimensions.exams.score
      const examPenalty = Math.min(30, input.missedKeyExams.length * 10)
      parsed.dimensions.exams.score = Math.max(0, examBaseScore - examPenalty)

      const dimensions = parsed.dimensions
      parsed.score_total = Math.round(
        (dimensions.history_taking.score +
          dimensions.differential.score +
          dimensions.diagnosis.score +
          dimensions.exams.score +
          dimensions.management.score) /
          5,
      )

      parsed.correct_diagnosis = input.correctDiagnosis

      return parsed
    } catch {
      throw new DomainException('FEEDBACK_GENERATION_FAILED', 500)
    }
  }
}
