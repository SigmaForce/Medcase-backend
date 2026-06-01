export type ObjectiveDifficulty = 'beginner' | 'intermediate' | 'advanced'
export type ObjectiveQuestionStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'regenerating'
export type ObjectiveQuestionSource = 'inep' | 'ai_generated'
export type ObjectiveAlternativeKey = 'A' | 'B' | 'C' | 'D' | 'E'

export interface ObjectiveAlternative {
  key: ObjectiveAlternativeKey
  text: string
}

export interface ObjectiveQuestion {
  id: string
  specialtyId: number | null
  createdById: string | null
  stem: string
  alternatives: ObjectiveAlternative[]
  correctAlternative: ObjectiveAlternativeKey
  explanation: string | null
  difficulty: ObjectiveDifficulty
  status: ObjectiveQuestionStatus
  sourceType: ObjectiveQuestionSource
  sourceLabel: string
  year: number | null
  edition: string | null
  externalId: string
  sourceUrl: string | null
  tags: string[]
  isAnnulled: boolean
  createdAt: Date
  updatedAt: Date
}

export const hasAlternative = (
  question: Pick<ObjectiveQuestion, 'alternatives'>,
  selectedAlternative: string,
): selectedAlternative is ObjectiveAlternativeKey => {
  return question.alternatives.some((a) => a.key === selectedAlternative)
}

export const isQuestionCorrect = (
  question: Pick<ObjectiveQuestion, 'correctAlternative' | 'isAnnulled'>,
  selectedAlternative: ObjectiveAlternativeKey,
): boolean => {
  if (question.isAnnulled) return true
  return question.correctAlternative === selectedAlternative
}
