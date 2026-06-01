import { ObjectiveQuestion } from '../../domain/entities/objective-question.entity'
import { ObjectiveAttempt, ObjectiveSimulation } from '../../domain/entities/objective-simulation.entity'

export const publicQuestion = (question: ObjectiveQuestion, includeAnswer = false) => ({
  id: question.id,
  specialty_id: question.specialtyId,
  stem: question.stem,
  alternatives: question.alternatives,
  difficulty: question.difficulty,
  source_type: question.sourceType,
  source_label: question.sourceLabel,
  year: question.year,
  edition: question.edition,
  source_url: question.sourceUrl,
  tags: question.tags,
  is_annulled: question.isAnnulled,
  created_at: question.createdAt,
  updated_at: question.updatedAt,
  ...(includeAnswer
    ? {
        correct_alternative: question.correctAlternative,
        explanation: question.explanation,
      }
    : {}),
})

export const simulationSummary = (simulation: ObjectiveSimulation) => ({
  id: simulation.id,
  status: simulation.status,
  question_count: simulation.questionCount,
  filters: simulation.filters,
  timed_limit_secs: simulation.timedLimitSecs,
  active_elapsed_secs: simulation.activeElapsedSecs ?? 0,
  score_total: simulation.scoreTotal,
  score_percent: simulation.scorePercent,
  started_at: simulation.startedAt,
  completed_at: simulation.completedAt,
  duration_secs: simulation.durationSecs,
})

export const attemptResponse = (attempt: ObjectiveAttempt) => ({
  id: attempt.id,
  question_id: attempt.questionId,
  simulation_id: attempt.simulationId,
  selected_alternative: attempt.selectedAlternative,
  is_correct: attempt.isCorrect,
  time_spent_secs: attempt.timeSpentSecs,
  answered_at: attempt.answeredAt,
})
