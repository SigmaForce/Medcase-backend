import { Inject, Injectable } from '@nestjs/common'
import { DomainException } from '../../../../errors/domain-exception'
import { hasAlternative, isQuestionCorrect, ObjectiveAlternativeKey } from '../../domain/entities/objective-question.entity'
import { IObjectiveExamRepository } from '../../domain/interfaces/objective-exam-repository.interface'
import { attemptResponse, publicQuestion } from './phase1-presenters'

export interface AnswerObjectiveQuestionInput {
  userId: string
  questionId: string
  selectedAlternative: ObjectiveAlternativeKey
  timeSpentSecs?: number
}

@Injectable()
export class AnswerObjectiveQuestion {
  constructor(
    @Inject('IObjectiveExamRepository')
    private readonly repo: IObjectiveExamRepository,
  ) {}

  async execute(input: AnswerObjectiveQuestionInput) {
    const question = await this.repo.findQuestionById(input.questionId)
    if (!question || question.status !== 'approved') {
      throw new DomainException('QUESTION_NOT_FOUND', 404)
    }

    if (!hasAlternative(question, input.selectedAlternative)) {
      throw new DomainException('INVALID_ALTERNATIVE', 400)
    }

    const isCorrect = isQuestionCorrect(question, input.selectedAlternative)
    const attempt = await this.repo.saveStandaloneAttempt({
      userId: input.userId,
      questionId: question.id,
      selectedAlternative: input.selectedAlternative,
      isCorrect,
      timeSpentSecs: input.timeSpentSecs,
    })

    return {
      attempt: attemptResponse(attempt),
      result: {
        is_correct: isCorrect,
        correct_alternative: question.correctAlternative,
        explanation: question.explanation,
      },
      question: publicQuestion(question, true),
    }
  }
}
