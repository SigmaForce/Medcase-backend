import { Injectable } from '@nestjs/common'
import { OpenAiAdapter } from './openai.adapter'
import { MessageTurn } from '../../domain/entities/message-turn.entity'
import { DomainException } from '../../../../errors/domain-exception'
import { PepItem } from '../../../clinical-case/infrastructure/services/revalida-case-generator.service'
import { FeedbackDimension } from './feedback-generator.service'

export interface PepItemScore {
  id: number
  domain: string
  description: string
  level: 'inadequate' | 'partial' | 'adequate'
  score: number
  max_score: number
  justification: string
}

export interface RevalidaFeedbackResult {
  score_total: number
  max_score_total: number
  correct_diagnosis: string
  pep_scores: PepItemScore[]
  strengths: string[]
  improvements: string[]
  teaching_points: string[]
  dimensions: {
    history_taking: FeedbackDimension
    differential: FeedbackDimension
    diagnosis: FeedbackDimension
    exams: FeedbackDimension
    management: FeedbackDimension
  }
}

export interface RevalidaFeedbackGeneratorInput {
  correctDiagnosis: string
  expectedManagement: string
  teachingPoints: string[]
  pep: PepItem[]
  messages: MessageTurn[]
}

const DOMAIN_TO_DIMENSION: Record<PepItem['domain'], keyof RevalidaFeedbackResult['dimensions']> = {
  apresentacao: 'history_taking',
  anamnese: 'history_taking',
  exame_fisico: 'differential',
  investigacao: 'exams',
  conduta: 'management',
}

interface DimensionSummaries {
  history_taking: string
  physical_exam: string
  exams: string
  diagnosis: string
  management: string
}

const mapPepScoresToDimensions = (
  pepScores: PepItemScore[],
  dimensionSummaries: DimensionSummaries,
): RevalidaFeedbackResult['dimensions'] => {
  const acc: Record<string, { score: number; max: number }> = {
    history_taking: { score: 0, max: 0 },
    differential: { score: 0, max: 0 },
    diagnosis: { score: 0, max: 0 },
    exams: { score: 0, max: 0 },
    management: { score: 0, max: 0 },
  }

  for (const item of pepScores) {
    const dim = DOMAIN_TO_DIMENSION[item.domain as PepItem['domain']] ?? 'management'

    if (item.domain === 'conduta') {
      const isDiagnosis =
        item.description.toLowerCase().includes('hipótese') ||
        item.description.toLowerCase().includes('diagnós')
      const targetDim = isDiagnosis ? 'diagnosis' : 'management'
      acc[targetDim].score += item.score
      acc[targetDim].max += item.max_score
    } else {
      acc[dim].score += item.score
      acc[dim].max += item.max_score
    }
  }

  const toPercent = (score: number, max: number): number =>
    max === 0 ? 0 : Math.round((score / max) * 100)

  return {
    history_taking: {
      score: toPercent(acc.history_taking.score, acc.history_taking.max),
      analysis: dimensionSummaries.history_taking,
    },
    differential: {
      score: toPercent(acc.differential.score, acc.differential.max),
      analysis: dimensionSummaries.physical_exam,
    },
    diagnosis: {
      score: toPercent(acc.diagnosis.score, acc.diagnosis.max),
      analysis: dimensionSummaries.diagnosis,
    },
    exams: {
      score: toPercent(acc.exams.score, acc.exams.max),
      analysis: dimensionSummaries.exams,
    },
    management: {
      score: toPercent(acc.management.score, acc.management.max),
      analysis: dimensionSummaries.management,
    },
  }
}

@Injectable()
export class RevalidaFeedbackGeneratorService {
  constructor(private readonly openAi: OpenAiAdapter) {}

  async generate(input: RevalidaFeedbackGeneratorInput): Promise<RevalidaFeedbackResult> {
    const conversation = input.messages
      .filter((m) => m.role !== 'system')
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n')

    const pepTable = input.pep
      .map(
        (item) =>
          `[${item.id}] ${item.domain.toUpperCase()} — ${item.description}\n` +
          `  Sub-itens: ${item.sub_items.join(', ')}\n` +
          `  Pontuação: Inadequado=${item.scores.inadequate} | Parcial=${item.scores.partial} | Adequado=${item.scores.adequate}\n` +
          `  Critério adequado: ${item.criteria.adequate}\n` +
          `  Critério parcial: ${item.criteria.partial}\n` +
          `  Critério inadequado: ${item.criteria.inadequate}`,
      )
      .join('\n\n')

    const systemPrompt =
      'Você é um preceptor clínico do Exame Revalida (INEP), avaliando o desempenho de um estudante de medicina em uma estação prática.\n' +
      'Seu papel é duplo: avaliar com rigor (pontuar conforme o PEP) E ensinar (feedback formativo que ajude o estudante a crescer).\n\n' +
      'REGRAS PARA PONTUAÇÃO:\n' +
      '- Siga estritamente os critérios de cada item do PEP\n' +
      '- Dê crédito parcial quando o estudante tentou mas não completou todos os sub-itens\n' +
      '- Não penalize o que não foi avaliado — se não há evidência no transcript, classifique como inadequado\n\n' +
      'REGRAS PARA JUSTIFICATIVAS (pep_scores):\n' +
      '- Seja específico: cite exatamente o que o estudante fez ou deixou de fazer, com referência ao transcript\n' +
      '- Seja breve e direto: 1-2 frases por item\n' +
      '- Explique o raciocínio clínico quando relevante\n\n' +
      'REGRAS PARA DIMENSION_SUMMARIES:\n' +
      '- Escreva uma análise sintetizada para cada grupo de domínios (não repita as justificativas)\n' +
      '- history_taking: síntese da apresentação + anamnese (pontos fortes e lacunas da investigação)\n' +
      '- physical_exam: síntese do exame físico realizado (o que foi verbalizado, o que faltou)\n' +
      '- exams: síntese dos exames solicitados vs. necessários\n' +
      '- diagnosis: síntese da hipótese diagnóstica formulada\n' +
      '- management: síntese da conduta terapêutica proposta\n' +
      '- 2-3 frases por dimensão, conectando achados concretos ao impacto clínico\n\n' +
      'REGRAS PARA STRENGTHS:\n' +
      '- Liste 2-3 ações concretas que demonstraram boa prática clínica\n' +
      '- Inclua contexto clínico: por que aquela ação é relevante para este caso\n\n' +
      'REGRAS PARA IMPROVEMENTS:\n' +
      '- Identifique as 2-3 lacunas mais impactantes, não liste tudo\n' +
      '- Para cada uma: o que deveria ter sido feito + por que é clinicamente importante\n' +
      '- Seja construtivo, não punitivo\n\n' +
      'REGRAS PARA TEACHING_POINTS:\n' +
      '- Reformule os pontos de aprendizado do caso de forma didática\n' +
      '- Conecte cada ponto ao desempenho observado no transcript\n' +
      '- Priorize os pontos mais relevantes para as lacunas identificadas\n\n' +
      'Retorne APENAS JSON válido.'

    const teachingPointsSection =
      input.teachingPoints.length > 0
        ? `\nPONTOS DE APRENDIZADO DO CASO: ${input.teachingPoints.join('; ')}`
        : ''

    const userPrompt = `Avalie o desempenho do participante nesta estação do Revalida.

DIAGNÓSTICO CORRETO: ${input.correctDiagnosis}
CONDUTA ESPERADA: ${input.expectedManagement}${teachingPointsSection}

PEP — PADRÃO ESPERADO DE PROCEDIMENTOS:
${pepTable}

TRANSCRIÇÃO DA CONSULTA:
${conversation}

Para cada item do PEP, analise a transcrição e determine:
- "level": "inadequate" | "partial" | "adequate" (conforme critérios do item)
- "score": pontuação obtida (use o valor exato de scores.inadequate, scores.partial ou scores.adequate do PEP)
- "justification": cite diretamente o que o participante fez ou deixou de fazer (seja específico, não genérico)

Retorne JSON com esta estrutura exata:
{
  "pep_scores": [
    {
      "id": number,
      "domain": string,
      "description": string,
      "level": "inadequate" | "partial" | "adequate",
      "score": number,
      "max_score": number,
      "justification": string
    }
  ],
  "dimension_summaries": {
    "history_taking": string,
    "physical_exam": string,
    "exams": string,
    "diagnosis": string,
    "management": string
  },
  "strengths": ["ação concreta + relevância clínica", "..."],
  "improvements": ["o que deveria ter feito + por que importa clinicamente", "..."],
  "teaching_points": ["ponto didático conectado ao desempenho observado", "..."]
}`

    try {
      const result = await this.openAi.complete({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        responseFormat: 'json_object',
        temperature: 0.2,
        maxTokens: 3500,
      })

      const parsed = JSON.parse(result.content) as {
        pep_scores: PepItemScore[]
        dimension_summaries: DimensionSummaries
        strengths: string[]
        improvements: string[]
        teaching_points: string[]
      }

      const pepScores: PepItemScore[] = parsed.pep_scores.map((item, idx) => {
        const pepItem = input.pep[idx] ?? input.pep.find((p) => p.id === item.id)
        return {
          ...item,
          max_score: pepItem?.scores.adequate ?? item.max_score ?? 0,
        }
      })

      const maxScoreTotal = input.pep.reduce((sum, item) => sum + item.scores.adequate, 0)
      const scoreObtained = pepScores.reduce((sum, item) => sum + item.score, 0)
      const scoreTotal = maxScoreTotal > 0 ? Math.round((scoreObtained / maxScoreTotal) * 100) : 0

      const fallbackSummaries: DimensionSummaries = {
        history_taking: '',
        physical_exam: '',
        exams: '',
        diagnosis: '',
        management: '',
      }
      const dimensionSummaries = parsed.dimension_summaries ?? fallbackSummaries
      const dimensions = mapPepScoresToDimensions(pepScores, dimensionSummaries)

      return {
        score_total: scoreTotal,
        max_score_total: maxScoreTotal,
        correct_diagnosis: input.correctDiagnosis,
        pep_scores: pepScores,
        strengths: parsed.strengths ?? [],
        improvements: parsed.improvements ?? [],
        teaching_points: parsed.teaching_points ?? [],
        dimensions,
      }
    } catch {
      throw new DomainException('REVALIDA_FEEDBACK_GENERATION_FAILED', 500)
    }
  }
}
