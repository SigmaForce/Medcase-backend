import { Inject, Injectable } from '@nestjs/common'
import { IObjectiveExamRepository } from '../../domain/interfaces/objective-exam-repository.interface'
import { ObjectiveDifficulty, ObjectiveQuestionSource } from '../../domain/entities/objective-question.entity'
import { publicQuestion } from './phase1-presenters'

export interface ListObjectiveQuestionsInput {
  specialtyId?: number
  difficulty?: ObjectiveDifficulty
  source?: ObjectiveQuestionSource | 'all'
  year?: number
  edition?: string
  tag?: string
  page: number
  limit: number
}

@Injectable()
export class ListObjectiveQuestions {
  constructor(
    @Inject('IObjectiveExamRepository')
    private readonly repo: IObjectiveExamRepository,
  ) {}

  async execute(input: ListObjectiveQuestionsInput) {
    const result = await this.repo.findQuestions(input)

    return {
      data: result.data.map((q) => publicQuestion(q, false)),
      meta: {
        page: input.page,
        limit: input.limit,
        total: result.total,
      },
    }
  }
}
