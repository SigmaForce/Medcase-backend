import { Inject, Injectable } from '@nestjs/common'
import { DomainException } from '../../../../errors/domain-exception'
import { IObjectiveExamRepository } from '../../domain/interfaces/objective-exam-repository.interface'
import { ImportInepQuestionsDto } from '../dtos/phase1.dto'

@Injectable()
export class ImportInepObjectiveQuestions {
  constructor(
    @Inject('IObjectiveExamRepository')
    private readonly repo: IObjectiveExamRepository,
  ) {}

  async execute(input: ImportInepQuestionsDto & { userId: string }) {
    let created = 0
    let updated = 0
    const questions = []

    for (const question of input.questions) {
      const keys = question.alternatives.map((a) => a.key)
      if (new Set(keys).size !== keys.length) {
        throw new DomainException('DUPLICATED_ALTERNATIVE_KEY', 400, question.external_id)
      }
      if (!keys.includes(question.correct_alternative)) {
        throw new DomainException('CORRECT_ALTERNATIVE_NOT_FOUND', 400, question.external_id)
      }

      const result = await this.repo.upsertQuestion({
        specialtyId: question.specialty_id ?? null,
        stem: question.stem,
        alternatives: question.alternatives,
        correctAlternative: question.correct_alternative,
        explanation: question.explanation ?? null,
        difficulty: question.difficulty,
        status: question.status,
        sourceType: 'inep',
        sourceLabel: question.source_label,
        year: question.year ?? null,
        edition: question.edition ?? null,
        externalId: question.external_id,
        sourceUrl: question.source_url ?? null,
        tags: question.tags,
        isAnnulled: question.is_annulled,
      }, input.userId)

      if (result.created) created += 1
      else updated += 1

      questions.push({
        id: result.question.id,
        external_id: result.question.externalId,
        created: result.created,
      })
    }

    return {
      imported: questions.length,
      created,
      updated,
      questions,
    }
  }
}
