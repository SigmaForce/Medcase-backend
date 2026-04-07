import { Injectable } from '@nestjs/common'
import { OpenAiAdapter } from '../adapters/openai.adapter'
import { CaseDifficulty, CaseLanguage, CountryContext } from '../../domain/entities/clinical-case.entity'
import { DomainException } from '../../../../errors/domain-exception'

export interface RevalidaGenerateInput {
  specialtyName: string
  specialtyArea: string
  difficulty: CaseDifficulty
  language: CaseLanguage
  countryContext: CountryContext
  attentionLevel: 'primaria' | 'secundaria' | 'terciaria'
}

export interface PatientScript {
  chief_complaint: Record<string, string>
  associated_symptoms: Record<string, string>
  history: Record<string, string>
}

export interface PepItem {
  id: number
  domain: 'apresentacao' | 'anamnese' | 'exame_fisico' | 'investigacao' | 'conduta'
  description: string
  sub_items: string[]
  scores: { inadequate: number; partial: number; adequate: number }
  criteria: { adequate: string; partial: string; inadequate: string }
  key_item: boolean
}

export interface RevalidaExamItem {
  slug: string
  name: string
  result: string
  is_key: boolean
  category: string
}

export interface RevalidaAvailableExams {
  laboratory: RevalidaExamItem[]
  imaging: RevalidaExamItem[]
  ecg: RevalidaExamItem[]
  other: RevalidaExamItem[]
}

export interface RevalidaCaseBrief {
  diagnosis: string
  differential: string[]
  expected_management: string
  key_findings: string[]
  teaching_points: string[]
  patient_script: PatientScript
  pep: PepItem[]
  available_exams: RevalidaAvailableExams
  station_config: {
    attention_level: string
    specialty_area: string
    duration_secs: number
  }
}

export interface RevalidaPatientProfile {
  name: string
  age: number
  sex: string
  occupation: string
  context: string
}

export interface GeneratedRevalidaCaseData {
  title: string
  opening_message: string
  case_brief: RevalidaCaseBrief
  patient_profile: RevalidaPatientProfile
}

const MAX_RETRIES = 3

@Injectable()
export class RevalidaCaseGeneratorService {
  constructor(private readonly openAi: OpenAiAdapter) {}

  async generate(input: RevalidaGenerateInput): Promise<GeneratedRevalidaCaseData> {
    const systemPrompt = this.buildSystemPrompt(input)
    const userPrompt = this.buildUserPrompt(input)

    let lastError: Error | null = null

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const raw = await this.openAi.chatCompletion({ systemPrompt, userPrompt, maxTokens: 4000, temperature: 0.95 })
        const parsed = this.parseAndValidate(raw)
        return parsed
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))
        if (attempt === MAX_RETRIES) break
      }
    }

    throw new DomainException(
      'REVALIDA_GENERATION_FAILED',
      500,
      lastError?.message ?? 'Revalida case generation failed after retries',
    )
  }

  private buildSystemPrompt(input: RevalidaGenerateInput): string {
    return `Você é um elaborador de questões do Exame Revalida (INEP), especialista em provas práticas de
habilidades clínicas da 2ª fase. Sua tarefa é gerar uma ESTAÇÃO COMPLETA no padrão oficial do Revalida.

Retorne APENAS um JSON válido, sem texto antes ou depois, sem markdown.

ESTRUTURA DA ESTAÇÃO REVALIDA:
- Duração: 10 minutos por estação
- O participante atende um paciente simulado (ator ou manequim)
- A avaliação segue o PEP (Padrão Esperado de Procedimentos), com itens em 3 níveis:
  INADEQUADO (0 pontos) | PARCIALMENTE ADEQUADO (pontuação intermediária) | ADEQUADO (pontuação máxima)
- O paciente só responde ao que for perguntado — nunca revela diagnóstico

REGRAS DO CASO:
- Nível de atenção: "${input.attentionLevel}" (primária=UBS, secundária=hospital médio porte, terciária=hospital terciário)
- Área: "${input.specialtyArea}"
- Dificuldade: "${input.difficulty}"
- País/contexto: "${input.countryContext}" (BR=SUS, PY=IPS/privado)
- Idioma: "${input.language}"
- O diagnóstico NUNCA aparece na apresentação do paciente nem nas respostas do roteiro
- O patient_script deve ter respostas em linguagem LEIGA, não médica
- O campo duration do patient_script DEVE ser um número concreto (ex: "7 dias", "2 semanas", "3 meses") — NUNCA use expressões vagas como "há alguns dias" ou "faz algum tempo"
- Os impressos são entregues condicionalmente pelo sistema quando o participante solicita/verbaliza corretamente

DOMÍNIOS DO PEP (obrigatório ter itens em todos):
1. apresentacao — identificação e cumprimento
2. anamnese — características da queixa + sintomas associados + antecedentes relevantes
3. exame_fisico — técnicas de exame com verbalização (se aplicável à estação)
4. investigacao — exames laboratoriais e de imagem pertinentes
5. conduta — hipótese diagnóstica + tratamento + orientações + encaminhamento

DIVERSIDADE OBRIGATÓRIA:
- Varie as profissões dos pacientes — exemplos: professor, engenheiro, aposentado, pedreiro, costureira, estudante, cozinheiro, faxineiro, vendedor ambulante, pescador, enfermeira, mecânico, cabeleireira, segurança, auxiliar administrativo, agricultor, comerciante, zelador, motorista de ônibus, auxiliar de enfermagem, garçom, eletricista, contador
- Não se limite às doenças mais frequentes ou "clássicas" da especialidade — explore o espectro completo
- Varie faixa etária amplamente: de 18 a 80 anos
- Alterne sexo entre casos: M e F`
  }

  private buildUserPrompt(input: RevalidaGenerateInput): string {
    return `Gere uma estação de ${input.specialtyName} (${input.specialtyArea}) nível de atenção ${input.attentionLevel},
dificuldade ${input.difficulty}, contexto ${input.countryContext}, idioma ${input.language}.

Retorne o JSON no seguinte formato:

{
  "title": "Título descritivo sem revelar diagnóstico",
  "opening_message": "Primeira fala do paciente — queixa principal em 1ª pessoa, linguagem leiga",
  "case_brief": {
    "diagnosis": "Diagnóstico principal completo",
    "differential": ["Diagnóstico diferencial 1", "Diagnóstico diferencial 2"],
    "expected_management": "Conduta esperada detalhada pelo PEP",
    "key_findings": ["Achado clínico relevante 1", "Achado clínico relevante 2"],
    "teaching_points": ["Ponto de aprendizado clínico 1"],
    "station_config": {
      "attention_level": "${input.attentionLevel}",
      "specialty_area": "${input.specialtyArea}",
      "duration_secs": 600
    },
    "patient_script": {
      "chief_complaint": {
        "onset": "Resposta leiga sobre início da queixa",
        "duration": "Há quanto tempo tem o problema — use SEMPRE um número concreto, ex: '7 dias', '2 semanas', '3 meses'",
        "frequency": "Com que frequência ocorre",
        "intensity": "Como descreveria a intensidade (use escala 0-10 se dor)",
        "radiation": "Se irradia ou não, para onde",
        "aggravating_factors": "O que piora",
        "relieving_factors": "O que melhora",
        "character": "Como é a dor/sintoma (queimação, pressão, pontada etc.)",
        "nocturnal": "Se acorda à noite com o sintoma",
        "progression": "Se está melhorando, piorando ou igual"
      },
      "associated_symptoms": {
        "fever": "Resposta sobre febre",
        "nausea_vomiting": "Resposta sobre náusea/vômito",
        "appetite": "Resposta sobre apetite",
        "weight_loss": "Resposta sobre perda de peso",
        "fatigue": "Resposta sobre cansaço",
        "other_relevant": "Outro sintoma relevante para este caso específico"
      },
      "history": {
        "medications": "Medicamentos em uso (linguagem leiga)",
        "allergies": "Alergias conhecidas",
        "previous_diseases": "Doenças anteriores relevantes",
        "family_history": "Histórico familiar relevante",
        "social_history": "Profissão, hábitos, contexto social",
        "obstetric_history": "Apenas se mulher em idade fértil, caso contrário omitir"
      },
      },
    "pep": [
      {
        "id": 1,
        "domain": "apresentacao",
        "description": "Apresentação ao paciente",
        "sub_items": ["identifica-se pelo nome", "cumprimenta o paciente"],
        "scores": { "inadequate": 0.0, "partial": 0.25, "adequate": 0.5 },
        "criteria": {
          "adequate": "Realiza as duas ações",
          "partial": "Realiza apenas uma ação",
          "inadequate": "Não realiza nenhuma ação"
        },
        "key_item": false
      },
      {
        "id": 2,
        "domain": "anamnese",
        "description": "Investiga características da queixa principal",
        "sub_items": ["início/duração", "intensidade", "caráter", "irradiação", "fatores de piora", "fatores de melhora", "horário/ritmo"],
        "scores": { "inadequate": 0.0, "partial": 0.75, "adequate": 1.5 },
        "criteria": {
          "adequate": "Investiga cinco ou mais características",
          "partial": "Investiga três ou quatro características",
          "inadequate": "Investiga duas ou menos características"
        },
        "key_item": true
      },
      {
        "id": 3,
        "domain": "anamnese",
        "description": "Investiga sintomas associados relevantes",
        "sub_items": ["sintoma associado 1 específico do caso", "sintoma associado 2", "sintoma associado 3"],
        "scores": { "inadequate": 0.0, "partial": 0.5, "adequate": 1.0 },
        "criteria": {
          "adequate": "Investiga três ou mais sintomas associados",
          "partial": "Investiga um ou dois sintomas",
          "inadequate": "Não investiga sintomas associados"
        },
        "key_item": true
      },
      {
        "id": 4,
        "domain": "anamnese",
        "description": "Investiga antecedentes relevantes para o diagnóstico",
        "sub_items": ["antecedente 1 específico do caso", "antecedente 2"],
        "scores": { "inadequate": 0.0, "partial": 0.5, "adequate": 1.0 },
        "criteria": {
          "adequate": "Investiga os dois antecedentes",
          "partial": "Investiga apenas um antecedente",
          "inadequate": "Não investiga antecedentes"
        },
        "key_item": false
      },
      {
        "id": 5,
        "domain": "exame_fisico",
        "description": "Solicita e/ou realiza exame físico pertinente verbalizando as manobras",
        "sub_items": ["manobra ou técnica 1", "manobra ou técnica 2", "manobra ou técnica 3"],
        "scores": { "inadequate": 0.0, "partial": 1.0, "adequate": 2.0 },
        "criteria": {
          "adequate": "Realiza as três manobras verbalizando corretamente",
          "partial": "Realiza uma ou duas manobras",
          "inadequate": "Não realiza ou não verbaliza nenhuma manobra"
        },
        "key_item": true
      },
      {
        "id": 6,
        "domain": "investigacao",
        "description": "Solicita exames laboratoriais pertinentes",
        "sub_items": ["exame laboratorial 1", "exame laboratorial 2", "exame laboratorial 3"],
        "scores": { "inadequate": 0.0, "partial": 0.5, "adequate": 1.0 },
        "criteria": {
          "adequate": "Solicita quatro ou mais exames pertinentes",
          "partial": "Solicita dois ou três exames",
          "inadequate": "Solicita um ou nenhum exame"
        },
        "key_item": false
      },
      {
        "id": 7,
        "domain": "investigacao",
        "description": "Solicita exame de imagem pertinente",
        "sub_items": ["exame de imagem específico do caso"],
        "scores": { "inadequate": 0.0, "partial": 0.0, "adequate": 2.0 },
        "criteria": {
          "adequate": "Solicita o exame de imagem correto",
          "partial": "Não se aplica",
          "inadequate": "Não solicita exame de imagem"
        },
        "key_item": true
      },
      {
        "id": 8,
        "domain": "conduta",
        "description": "Formula hipótese diagnóstica correta",
        "sub_items": ["diagnóstico principal ou equivalente aceito"],
        "scores": { "inadequate": 0.0, "partial": 0.0, "adequate": 2.0 },
        "criteria": {
          "adequate": "Formula o diagnóstico correto ou equivalente clínico aceito",
          "partial": "Não se aplica",
          "inadequate": "Não formula ou formula diagnóstico incorreto"
        },
        "key_item": true
      },
      {
        "id": 9,
        "domain": "conduta",
        "description": "Prescreve tratamento adequado",
        "sub_items": ["medicamento ou intervenção 1", "medicamento ou intervenção 2"],
        "scores": { "inadequate": 0.0, "partial": 0.0, "adequate": 1.5 },
        "criteria": {
          "adequate": "Prescreve o tratamento correto de primeira linha",
          "partial": "Não se aplica",
          "inadequate": "Não prescreve ou prescreve tratamento incorreto"
        },
        "key_item": true
      },
      {
        "id": 10,
        "domain": "conduta",
        "description": "Orienta o paciente e define encaminhamento",
        "sub_items": ["orientação 1 relevante", "encaminhamento se pertinente"],
        "scores": { "inadequate": 0.0, "partial": 0.25, "adequate": 0.5 },
        "criteria": {
          "adequate": "Realiza as duas condutas",
          "partial": "Realiza apenas uma",
          "inadequate": "Não realiza nenhuma"
        },
        "key_item": false
      }
    ],
    "available_exams": {
      "laboratory": [
        {
          "slug": "hemograma",
          "name": "Hemograma completo",
          "result": "Resultado detalhado com valores e valores de referência relevantes para o diagnóstico deste caso",
          "is_key": true,
          "category": "laboratory"
        }
      ],
      "imaging": [
        {
          "slug": "slug_do_exame_de_imagem_principal",
          "name": "Nome do exame de imagem",
          "result": "Laudo descritivo do achado de imagem relevante para o diagnóstico",
          "is_key": true,
          "category": "imaging"
        }
      ],
      "ecg": [],
      "other": [
        {
          "slug": "sinais_vitais",
          "name": "Sinais vitais",
          "result": "PA: XXX/XX mmHg. FC: XX bpm. FR: XX irpm. Tax: XX,X°C. SpO₂: XX% em ar ambiente.",
          "is_key": false,
          "category": "other"
        },
        {
          "slug": "inspecao_geral",
          "name": "Inspeção geral",
          "result": "Estado geral e achados da inspeção geral específicos deste caso",
          "is_key": false,
          "category": "other"
        },
        {
          "slug": "ausculta_pulmonar",
          "name": "Ausculta pulmonar",
          "result": "Achado da ausculta pulmonar relevante ao diagnóstico deste caso — incluir apenas se pertinente",
          "is_key": true,
          "category": "other"
        },
        {
          "slug": "ausculta_cardiaca",
          "name": "Ausculta cardíaca",
          "result": "Achado da ausculta cardíaca — incluir apenas se pertinente ao caso",
          "is_key": false,
          "category": "other"
        }
      ]
    }
  },
  "patient_profile": {
    "name": "Nome fictício compatível com o país",
    "age": 35,
    "sex": "M",
    "occupation": "Profissão compatível com o contexto",
    "context": "Contexto social relevante para o caso"
  }
}

IMPORTANTE: Adapte os sub_items, critérios e impressos ao caso específico que você gerar.
Os impressos devem refletir os achados clínicos reais do diagnóstico escolhido.

REGRAS PARA available_exams.other (exame físico):
- Gere itens INDIVIDUAIS por manobra/sistema — NUNCA consolide tudo em um único item
- "sinais_vitais" e "inspecao_geral" devem SEMPRE estar presentes
- Inclua apenas os itens pertinentes ao caso específico gerado
- Exemplos de slugs válidos: ausculta_pulmonar, ausculta_cardiaca, palpacao_abdominal,
  percussao_toracica, exame_neurologico, exame_otorrinolaringologico, exame_dermatologico,
  exame_musculoesqueletico, exame_oftalmologico
- Cada slug deve ser único, em snake_case, correspondendo a UMA manobra ou sistema

Seed de variação: ${Math.random().toString(36).substring(2, 10)}`
  }

  private parseAndValidate(raw: string): GeneratedRevalidaCaseData {
    let parsed: unknown
    try {
      const clean = raw.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim()
      parsed = JSON.parse(clean)
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

    if (typeof brief.patient_script !== 'object' || brief.patient_script === null) {
      throw new Error('case_brief.patient_script is required')
    }

    if (!Array.isArray(brief.pep) || brief.pep.length < 5) {
      throw new Error('case_brief.pep must have at least 5 items')
    }

    const exams = brief.available_exams as Record<string, unknown> | undefined
    if (!exams || typeof exams !== 'object') {
      throw new Error('case_brief.available_exams is required')
    }
    const hasExams =
      (Array.isArray(exams.laboratory) && exams.laboratory.length > 0) ||
      (Array.isArray(exams.imaging) && exams.imaging.length > 0) ||
      (Array.isArray(exams.other) && exams.other.length > 0)
    if (!hasExams) {
      throw new Error('case_brief.available_exams must have at least 1 exam item')
    }

    return data as unknown as GeneratedRevalidaCaseData
  }
}
