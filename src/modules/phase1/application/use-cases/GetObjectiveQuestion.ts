import { Inject, Injectable } from '@nestjs/common'
import { DomainException } from '../../../../errors/domain-exception'
import { IObjectiveExamRepository } from '../../domain/interfaces/objective-exam-repository.interface'
import { publicQuestion } from './phase1-presenters'

export interface GetObjectiveQuestionInput {
  userId: string
  role: string
  questionId: string
}

@Injectable()
export class GetObjectiveQuestion {
  constructor(
    @Inject('IObjectiveExamRepository')
    private readonly repo: IObjectiveExamRepository,
  ) {}

  async execute(input: GetObjectiveQuestionInput) {
    const question = await this.repo.findQuestionById(input.questionId)
    if (!question || question.status !== 'approved') {
      throw new DomainException('QUESTION_NOT_FOUND', 404)
    }

    const isPrivileged = input.role === 'admin' || input.role === 'reviewer'
    const hasAnswered = isPrivileged
      ? true
      : await this.repo.hasUserAnsweredQuestion(input.userId, input.questionId)

    return { question: publicQuestion(question, hasAnswered) }
  }
}
