import { Inject, Injectable } from '@nestjs/common'
import { DomainException } from '../../../../errors/domain-exception'
import { hasAlternative, isQuestionCorrect, ObjectiveAlternativeKey } from '../../domain/entities/objective-question.entity'
import { IObjectiveExamRepository } from '../../domain/interfaces/objective-exam-repository.interface'
import { attemptResponse } from './phase1-presenters'

export interface SaveObjectiveSimulationAnswerInput {
  userId: string
  simulationId: string
  questionId: string
  selectedAlternative: ObjectiveAlternativeKey
  timeSpentSecs?: number
}

@Injectable()
export class SaveObjectiveSimulationAnswer {
  constructor(
    @Inject('IObjectiveExamRepository')
    private readonly repo: IObjectiveExamRepository,
  ) {}

  async execute(input: SaveObjectiveSimulationAnswerInput) {
    const simulation = await this.repo.findSimulationById(input.simulationId)
    if (!simulation || simulation.userId !== input.userId) {
      throw new DomainException('SIMULATION_NOT_FOUND', 404)
    }
    if (simulation.status !== 'in_progress') {
      throw new DomainException('SIMULATION_ALREADY_COMPLETED', 400)
    }
    if (!simulation.questionOrder.includes(input.questionId)) {
      throw new DomainException('QUESTION_NOT_IN_SIMULATION', 400)
    }

    const question = await this.repo.findQuestionById(input.questionId)
    if (!question) {
      throw new DomainException('QUESTION_NOT_FOUND', 404)
    }
    if (!hasAlternative(question, input.selectedAlternative)) {
      throw new DomainException('INVALID_ALTERNATIVE', 400)
    }

    const attempt = await this.repo.saveSimulationAttempt({
      userId: input.userId,
      simulationId: input.simulationId,
      questionId: input.questionId,
      selectedAlternative: input.selectedAlternative,
      isCorrect: isQuestionCorrect(question, input.selectedAlternative),
      timeSpentSecs: input.timeSpentSecs,
    })

    return { attempt: attemptResponse(attempt) }
  }
}
