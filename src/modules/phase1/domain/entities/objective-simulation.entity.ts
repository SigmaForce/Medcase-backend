export type ObjectiveSimulationStatus = 'in_progress' | 'completed' | 'abandoned'

export interface ObjectiveSimulationFilters {
  difficulty: Array<'beginner' | 'intermediate' | 'advanced'>
  source: 'inep' | 'ai_generated' | 'all'
  specialtyIds: number[]
}

export interface ObjectiveSimulation {
  id: string
  userId: string
  status: ObjectiveSimulationStatus
  questionCount: number
  filters: ObjectiveSimulationFilters
  questionOrder: string[]
  timedLimitSecs: number
  scoreTotal: number | null
  scorePercent: number | null
  startedAt: Date
  completedAt: Date | null
  durationSecs: number | null
  activeElapsedSecs: number | null
}

export interface ObjectiveAttempt {
  id: string
  userId: string
  questionId: string
  simulationId: string | null
  selectedAlternative: string
  isCorrect: boolean
  timeSpentSecs: number | null
  meta: Record<string, unknown>
  answeredAt: Date
}
