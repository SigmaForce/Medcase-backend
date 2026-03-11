import { Injectable } from '@nestjs/common'
import { OpenAiAdapter } from '../adapters/openai.adapter'
import { CaseDifficulty, CaseLanguage, CountryContext } from '../../domain/entities/clinical-case.entity'
import { DomainException } from '../../../../errors/domain-exception'

export interface GenerateInput {
  specialtyName: string
  difficulty: CaseDifficulty
  language: CaseLanguage
  countryContext: CountryContext
}

export interface PatientProfile {
  name: string
  age: number
  sex: string
  occupation: string
  context: string
}

export interface ExamItem {
  slug: string
  name: string
  result: string
  is_key: boolean
  category: string
}

export interface AvailableExamsRaw {
  laboratory: ExamItem[]
  imaging: ExamItem[]
  ecg: ExamItem[]
  other: ExamItem[]
}

export interface CaseBriefRaw {
  diagnosis: string
  differential: string[]
  expected_management: string
  key_findings?: string[]
  teaching_points?: string[]
}

export interface GeneratedCaseData {
  title: string
  opening_message: string
  case_brief: CaseBriefRaw
  patient_profile: PatientProfile
  available_exams: AvailableExamsRaw
}

const MAX_RETRIES = 3

@Injectable()
export class CaseGeneratorService {
  constructor(private readonly openAi: OpenAiAdapter) {}

  async generate(input: GenerateInput): Promise<GeneratedCaseData> {
    const systemPrompt = this.buildSystemPrompt(input)
    const userPrompt = this.buildUserPrompt(input)

    let lastError: Error | null = null

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const raw = await this.openAi.chatCompletion({ systemPrompt, userPrompt })
        const parsed = this.parseAndValidate(raw)
        return parsed
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))
        if (attempt === MAX_RETRIES) break
      }
    }

    throw new DomainException(
      'GENERATION_FAILED',
      500,
      lastError?.message ?? 'Case generation failed after retries',
    )
  }

  private buildSystemPrompt(input: GenerateInput): string {
    return `Você é um professor de medicina especialista em casos clínicos para o Exame
Revalida do Brasil. Sua tarefa é gerar um caso clínico realista e educativo.

Retorne APENAS um JSON válido, sem texto antes ou depois, sem markdown.

REGRAS DO CASO:
- Deve ser clinicamente coerente e baseado em medicina baseada em evidências
- A dificuldade "${input.difficulty}" define a complexidade do raciocínio exigido
- O contexto "${input.countryContext}" define o sistema de saúde (BR=SUS, PY=IPS/privado)
- O idioma de todo o conteúdo deve ser "${input.language}" (pt=português, es=espanhol)
- O diagnóstico real NUNCA deve aparecer na apresentação do paciente
- Os exames devem ter resultados coerentes com o diagnóstico real
- Marque como is_key=true os exames essenciais para o diagnóstico`
  }

  private buildUserPrompt(input: GenerateInput): string {
    return `Gere um caso clínico de ${input.specialtyName} com dificuldade ${input.difficulty}.
Contexto: sistema de saúde ${input.countryContext}, idioma ${input.language}.

Retorne o JSON no seguinte formato:

{
  "title": "Título descritivo sem revelar diagnóstico",
  "opening_message": "Primeira fala do paciente — queixa principal em 1ª pessoa",
  "case_brief": {
    "diagnosis": "Diagnóstico principal completo",
    "differential": ["Diagnóstico diferencial 1", "Diagnóstico diferencial 2"],
    "expected_management": "Conduta esperada detalhada",
    "key_findings": ["Achado clínico relevante 1"],
    "teaching_points": ["Ponto de aprendizado 1"]
  },
  "patient_profile": {
    "name": "Nome fictício compatível com o país",
    "age": 35,
    "sex": "M",
    "occupation": "Profissão",
    "context": "Contexto social relevante"
  },
  "available_exams": {
    "laboratory": [{ "slug": "hemograma", "name": "Hemograma completo", "result": "...", "is_key": false, "category": "laboratory" }],
    "imaging": [{ "slug": "rx_torax", "name": "Radiografia de tórax PA", "result": "...", "is_key": true, "category": "imaging" }],
    "ecg": [],
    "other": []
  }
}`
  }

  private parseAndValidate(raw: string): GeneratedCaseData {
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      throw new Error('Response is not valid JSON')
    }

    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('Response must be a JSON object')
    }

    const data = parsed as Record<string, unknown>

    if (typeof data.title !== 'string' || data.title.trim() === '') {
      throw new Error('Missing required field: title')
    }

    if (typeof data.opening_message !== 'string' || data.opening_message.trim() === '') {
      throw new Error('Missing required field: opening_message')
    }

    if (typeof data.case_brief !== 'object' || data.case_brief === null) {
      throw new Error('Missing required field: case_brief')
    }

    const brief = data.case_brief as Record<string, unknown>

    if (typeof brief.diagnosis !== 'string' || brief.diagnosis.trim() === '') {
      throw new Error('case_brief.diagnosis is required')
    }

    if (!Array.isArray(brief.differential) || brief.differential.length < 2) {
      throw new Error('case_brief.differential must have at least 2 items')
    }

    if (typeof brief.expected_management !== 'string' || brief.expected_management.trim() === '') {
      throw new Error('case_brief.expected_management is required')
    }

    if (typeof data.available_exams !== 'object' || data.available_exams === null) {
      throw new Error('Missing required field: available_exams')
    }

    const examsRaw = data.available_exams as Record<string, unknown>

    const toExamArray = (key: string): ExamItem[] => {
      if (examsRaw[key] === undefined) return []
      if (!Array.isArray(examsRaw[key])) {
        throw new Error(`available_exams.${key} must be an array`)
      }
      return (examsRaw[key] as unknown[]).map((e, i) => {
        const exam = e as Record<string, unknown>
        if (
          typeof exam.slug !== 'string' ||
          typeof exam.name !== 'string' ||
          typeof exam.result !== 'string' ||
          typeof exam.is_key !== 'boolean' ||
          typeof exam.category !== 'string'
        ) {
          throw new Error(`available_exams.${key}[${i}] missing required fields`)
        }
        return {
          slug: exam.slug as string,
          name: exam.name as string,
          result: exam.result as string,
          is_key: exam.is_key as boolean,
          category: exam.category as string,
        }
      })
    }

    const laboratory = toExamArray('laboratory')
    const imaging = toExamArray('imaging')
    const ecg = toExamArray('ecg')
    const other = toExamArray('other')

    const allExams = [...laboratory, ...imaging, ...ecg, ...other]

    if (allExams.length === 0) {
      throw new Error('available_exams must contain at least 1 exam')
    }

    const keyExams = allExams.filter((e) => e.is_key)
    if (keyExams.length < 2) {
      throw new Error('At least 2 exams must have is_key = true')
    }

    const slugs = allExams.map((e) => e.slug)
    const uniqueSlugs = new Set(slugs)
    if (uniqueSlugs.size !== slugs.length) {
      throw new Error('Exam slugs must be unique within the case')
    }

    return {
      title: data.title as string,
      opening_message: data.opening_message as string,
      case_brief: data.case_brief as CaseBriefRaw,
      patient_profile: data.patient_profile as PatientProfile,
      available_exams: { laboratory, imaging, ecg, other },
    }
  }
}
