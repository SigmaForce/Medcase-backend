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

const randomSex = (): string => (Math.random() < 0.5 ? 'M' : 'F')

const randomAge = (): number => {
  const ranges = [
    { min: 18, max: 35, weight: 2 },
    { min: 36, max: 55, weight: 3 },
    { min: 56, max: 75, weight: 3 },
    { min: 76, max: 85, weight: 2 },
  ]
  const total = ranges.reduce((sum, r) => sum + r.weight, 0)
  let rand = Math.random() * total
  for (const range of ranges) {
    rand -= range.weight
    if (rand <= 0) return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min
  }
  return 45
}

@Injectable()
export class CaseGeneratorService {
  constructor(private readonly openAi: OpenAiAdapter) {}

  async generate(input: GenerateInput): Promise<GeneratedCaseData> {
    const systemPrompt = this.buildSystemPrompt(input)
    const userPrompt = this.buildUserPrompt(input)

    let lastError: Error | null = null

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const raw = await this.openAi.chatCompletion({ systemPrompt, userPrompt, temperature: 0.95 })
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
- O campo context do patient_profile DEVE mencionar a duração dos sintomas com um número concreto (ex: "há 7 dias com febre", "tosse há 2 semanas") — NUNCA use expressões vagas como "há alguns dias" ou "faz algum tempo"
- Os exames devem ter resultados coerentes com o diagnóstico real
- Marque como is_key=true os exames essenciais para o diagnóstico
- O campo "result" de cada exame deve ser um laudo clínico detalhado com:
  * Valores numéricos reais com unidades (ex: Leucócitos: 14.200/mm³)
  * Valores de referência entre parênteses (ex: VR: 4.000–11.000/mm³)
  * Para exames de imagem: descrição radiológica objetiva (localização, tamanho, características morfológicas)
  * Para ECG: ritmo, frequência, eixo, alterações de segmento/onda descritas objetivamente
  * NUNCA inclua conclusão diagnóstica, hipótese ou impressão que revele o diagnóstico — apenas achados objetivos
  * NUNCA use resultados vagos como "alterado" ou "dentro do esperado" sem valores
- Para exames laboratoriais especificamente: liste APENAS valores numéricos brutos com unidade e valor de referência por parâmetro, separados por ponto. NUNCA use termos interpretativos como "desvio à esquerda", "leucocitose", "anemia normocítica", "trombocitose", "pancitopenia" — apenas os números brutos. O estudante deve inferir a interpretação clínica.
- SEMPRE inclua "sinais_vitais" no array other de available_exams com formato: "PA: XXX/XX mmHg. FC: XX bpm. FR: XX irpm. Tax: XX,X°C. SpO₂: XX% em ar ambiente."

DIVERSIDADE OBRIGATÓRIA:
- Varie as profissões dos pacientes — exemplos: professor, engenheiro, aposentado, pedreiro, costureira, estudante, cozinheiro, faxineiro, vendedor ambulante, pescador, enfermeira, mecânico, cabeleireira, segurança, auxiliar administrativo, agricultor, comerciante, zelador, motorista de ônibus, auxiliar de enfermagem, garçom, eletricista, contador
- Não se limite às doenças mais frequentes ou "clássicas" da especialidade — explore o espectro completo
- Varie faixa etária amplamente: de 18 a 80 anos
- Alterne sexo entre casos: M e F`
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
    "age": ${randomAge()},
    "sex": "${randomSex()}",
    "occupation": "Profissão",
    "context": "Contexto social relevante"
  },
  "available_exams": {
    "laboratory": [{ "slug": "hemograma", "name": "Hemograma completo", "result": "Leucócitos: 14.200/mm³ (VR: 4.000–11.000). Neutrófilos: 82% (VR: 50–70%). Linfócitos: 12% (VR: 20–40%). Bastões: 12% (VR: 0–5%). Hemoglobina: 11,2 g/dL (VR: 12–16). Hematócrito: 34% (VR: 36–46%). VCM: 85 fL (VR: 80–100). Plaquetas: 420.000/mm³ (VR: 150.000–400.000).", "is_key": true, "category": "laboratory" }],
    "imaging": [{ "slug": "rx_torax", "name": "Radiografia de tórax PA", "result": "Opacidade heterogênea no lobo superior direito com broncograma aéreo visível. Seios costofrênicos livres. Área cardíaca com ICT 0,48. Traqueia centrada.", "is_key": true, "category": "imaging" }],
    "ecg": [],
    "other": [{ "slug": "sinais_vitais", "name": "Sinais vitais", "result": "PA: 130/85 mmHg. FC: 102 bpm. FR: 22 irpm. Tax: 38,5°C. SpO₂: 94% em ar ambiente.", "is_key": false, "category": "other" }]
  }
}

Seed de variação: ${Math.random().toString(36).substring(2, 10)}`
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
    if (keyExams.length < 1) {
      throw new Error('At least 1 exam must have is_key = true')
    }

    const slugs = allExams.map((e) => e.slug)
    const uniqueSlugs = new Set(slugs)
    if (uniqueSlugs.size !== slugs.length) {
      throw new Error('Exam slugs must be unique within the case')
    }

    const hasVitalSigns = other.some((e) => e.slug === 'sinais_vitais')
    if (!hasVitalSigns) {
      throw new Error('available_exams.other must contain sinais_vitais')
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
