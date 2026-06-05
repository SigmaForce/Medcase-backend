import { Inject, Injectable } from '@nestjs/common'
import { DomainException } from '../../../../errors/domain-exception'
import { IObjectiveExamRepository } from '../../domain/interfaces/objective-exam-repository.interface'
import { publicQuestion, simulationSummary } from './phase1-presenters'
import { clampObjectiveSimulationActiveElapsed } from './objective-simulation-active-time'

const percent = (score: number, total: number): number => {
  if (total === 0) return 0
  return Math.round((score / total) * 10000) / 100
}

const accuracy = (correct: number, total: number) => ({
  correct,
  total,
  accuracy: percent(correct, total),
})

export interface CompleteObjectiveSimulationInput {
  userId: string
  simulationId: string
  activeElapsedSecs?: number
}

@Injectable()
export class CompleteObjectiveSimulation {
  constructor(
    @Inject('IObjectiveExamRepository')
    private readonly repo: IObjectiveExamRepository,
  ) {}

  async execute(input: CompleteObjectiveSimulationInput) {
    if (
      input.activeElapsedSecs !== undefined
      && (!Number.isSafeInteger(input.activeElapsedSecs) || input.activeElapsedSecs < 0)
    ) {
      throw new DomainException('INVALID_ACTIVE_ELAPSED_SECS', 400)
    }

    const simulation = await this.repo.findSimulationById(input.simulationId)
    if (!simulation || simulation.userId !== input.userId) {
      throw new DomainException('SIMULATION_NOT_FOUND', 404)
    }
    if (simulation.status !== 'in_progress') {
      throw new DomainException('SIMULATION_ALREADY_COMPLETED', 400)
    }

    const [questions, attempts] = await Promise.all([
      this.repo.findQuestionsByIds(simulation.questionOrder),
      this.repo.findAttemptsBySimulation(simulation.id),
    ])
    const attemptsByQuestion = new Map(attempts.map((a) => [a.questionId, a]))
    const scoreTotal = attempts.filter((a) => a.isCorrect).length
    const scorePercent = percent(scoreTotal, simulation.questionOrder.length)
    const completedAt = new Date()
    const activeElapsedSecs = this.resolveActiveElapsedSecs(simulation, input.activeElapsedSecs, completedAt)
    const durationSecs = activeElapsedSecs

    const completed = await this.repo.completeSimulation({
      simulationId: simulation.id,
      scoreTotal,
      scorePercent,
      durationSecs,
      completedAt,
      activeElapsedSecs,
    })

    const bySpecialty = new Map<string, { correct: number; total: number }>()
    const byDifficulty = new Map<string, { correct: number; total: number }>()
    const bySource = new Map<string, { correct: number; total: number }>()
    const byTag = new Map<string, { correct: number; total: number }>()

    for (const question of questions) {
      const attempt = attemptsByQuestion.get(question.id)
      const correct = attempt?.isCorrect ? 1 : 0
      this.increment(bySpecialty, String(question.specialtyId ?? 'general'), correct)
      this.increment(byDifficulty, question.difficulty, correct)
      this.increment(bySource, question.sourceType, correct)
      for (const tag of question.tags) {
        this.increment(byTag, tag, correct)
      }
    }

    return {
      simulation: simulationSummary(completed),
      result: {
        score_total: scoreTotal,
        score_percent: scorePercent,
        unanswered: simulation.questionOrder.length - attempts.length,
        by_specialty: this.toStats(bySpecialty),
        by_difficulty: this.toStats(byDifficulty),
        by_source: this.toStats(bySource),
        by_tag: this.toStats(byTag),
      },
      questions: questions.map((q, index) => ({
        order: index + 1,
        ...publicQuestion(q, true),
        selected_alternative: attemptsByQuestion.get(q.id)?.selectedAlternative ?? null,
        is_correct: attemptsByQuestion.get(q.id)?.isCorrect ?? false,
      })),
    }
  }

  private increment(map: Map<string, { correct: number; total: number }>, key: string, correct: number) {
    const current = map.get(key) ?? { correct: 0, total: 0 }
    current.correct += correct
    current.total += 1
    map.set(key, current)
  }

  private toStats(map: Map<string, { correct: number; total: number }>) {
    return Object.fromEntries(
      [...map.entries()].map(([key, value]) => [key, accuracy(value.correct, value.total)]),
    )
  }

  private resolveActiveElapsedSecs(
    simulation: {
      activeElapsedSecs: number | null
      timedLimitSecs: number | null
      startedAt: Date
    },
    inputActiveElapsedSecs: number | undefined,
    completedAt: Date,
  ) {
    if (inputActiveElapsedSecs !== undefined) {
      return clampObjectiveSimulationActiveElapsed({
        currentActiveElapsedSecs: simulation.activeElapsedSecs,
        nextActiveElapsedSecs: inputActiveElapsedSecs,
        timedLimitSecs: simulation.timedLimitSecs,
      })
    }

    if (simulation.activeElapsedSecs !== null) {
      return clampObjectiveSimulationActiveElapsed({
        currentActiveElapsedSecs: simulation.activeElapsedSecs,
        nextActiveElapsedSecs: simulation.activeElapsedSecs,
        timedLimitSecs: simulation.timedLimitSecs,
      })
    }

    return Math.floor((completedAt.getTime() - simulation.startedAt.getTime()) / 1000)
  }
}
