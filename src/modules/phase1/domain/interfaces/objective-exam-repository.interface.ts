import { ObjectiveQuestion, ObjectiveQuestionSource, ObjectiveQuestionStatus, ObjectiveDifficulty, ObjectiveAlternative } from '../entities/objective-question.entity'
import { ObjectiveAttempt, ObjectiveSimulation, ObjectiveSimulationFilters } from '../entities/objective-simulation.entity'

export interface ListObjectiveQuestionsFilters {
  specialtyId?: number
  difficulty?: ObjectiveDifficulty
  source?: ObjectiveQuestionSource | 'all'
  year?: number
  edition?: string
  tag?: string
  page: number
  limit: number
}

export interface ObjectiveQuestionImportInput {
  specialtyId?: number | null
  stem: string
  alternatives: ObjectiveAlternative[]
  correctAlternative: string
  explanation?: string | null
  difficulty: ObjectiveDifficulty
  status?: ObjectiveQuestionStatus
  sourceType: ObjectiveQuestionSource
  sourceLabel: string
  year?: number | null
  edition?: string | null
  externalId: string
  sourceUrl?: string | null
  tags?: string[]
  isAnnulled?: boolean
}

export interface SimulationSelectionFilters extends ObjectiveSimulationFilters {
  questionCount: number
}

export interface PerformanceAttemptRecord extends ObjectiveAttempt {
  question: Pick<
    ObjectiveQuestion,
    'specialtyId' | 'difficulty' | 'sourceType' | 'tags'
  >
}

export interface IObjectiveExamRepository {
  findQuestions(filters: ListObjectiveQuestionsFilters): Promise<{ data: ObjectiveQuestion[]; total: number }>
  findQuestionById(id: string): Promise<ObjectiveQuestion | null>
  findApprovedForSimulation(filters: SimulationSelectionFilters): Promise<ObjectiveQuestion[]>
  hasUserAnsweredQuestion(userId: string, questionId: string): Promise<boolean>
  saveStandaloneAttempt(input: {
    userId: string
    questionId: string
    selectedAlternative: string
    isCorrect: boolean
    timeSpentSecs?: number | null
    meta?: Record<string, unknown>
  }): Promise<ObjectiveAttempt>
  createSimulation(input: {
    userId: string
    questionCount: number
    filters: ObjectiveSimulationFilters
    questionOrder: string[]
    timedLimitSecs: number
  }): Promise<ObjectiveSimulation>
  findSimulationById(id: string): Promise<ObjectiveSimulation | null>
  listSimulations(input: { userId: string; page: number; limit: number }): Promise<{ data: ObjectiveSimulation[]; total: number }>
  findQuestionsByIds(ids: string[]): Promise<ObjectiveQuestion[]>
  findAttemptsBySimulation(simulationId: string): Promise<ObjectiveAttempt[]>
  saveSimulationAttempt(input: {
    userId: string
    simulationId: string
    questionId: string
    selectedAlternative: string
    isCorrect: boolean
    timeSpentSecs?: number | null
    meta?: Record<string, unknown>
  }): Promise<ObjectiveAttempt>
  completeSimulation(input: {
    simulationId: string
    scoreTotal: number
    scorePercent: number
    durationSecs: number
    completedAt: Date
    activeElapsedSecs?: number | null
  }): Promise<ObjectiveSimulation>
  updateSimulationActiveElapsed(input: {
    simulationId: string
    activeElapsedSecs: number
  }): Promise<ObjectiveSimulation>
  upsertQuestion(input: ObjectiveQuestionImportInput, createdById?: string | null): Promise<{ question: ObjectiveQuestion; created: boolean }>
  findPerformanceAttempts(userId: string): Promise<PerformanceAttemptRecord[]>
}
