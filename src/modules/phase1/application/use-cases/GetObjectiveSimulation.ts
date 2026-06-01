import { Inject, Injectable } from '@nestjs/common'
import { DomainException } from '../../../../errors/domain-exception'
import { IObjectiveExamRepository } from '../../domain/interfaces/objective-exam-repository.interface'
import { publicQuestion, simulationSummary } from './phase1-presenters'

export interface GetObjectiveSimulationInput {
  userId: string
  simulationId: string
}

@Injectable()
export class GetObjectiveSimulation {
  constructor(
    @Inject('IObjectiveExamRepository')
    private readonly repo: IObjectiveExamRepository,
  ) {}

  async execute(input: GetObjectiveSimulationInput) {
    const simulation = await this.repo.findSimulationById(input.simulationId)
    if (!simulation || simulation.userId !== input.userId) {
      throw new DomainException('SIMULATION_NOT_FOUND', 404)
    }

    const [questions, attempts] = await Promise.all([
      this.repo.findQuestionsByIds(simulation.questionOrder),
      this.repo.findAttemptsBySimulation(simulation.id),
    ])
    const attemptsByQuestion = new Map(attempts.map((a) => [a.questionId, a]))
    const includeAnswer = simulation.status === 'completed'

    return {
      simulation: simulationSummary(simulation),
      questions: questions.map((q, index) => ({
        order: index + 1,
        ...publicQuestion(q, includeAnswer),
        selected_alternative: attemptsByQuestion.get(q.id)?.selectedAlternative ?? null,
        is_correct: includeAnswer ? attemptsByQuestion.get(q.id)?.isCorrect ?? null : undefined,
      })),
    }
  }
}
