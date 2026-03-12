import { Inject, Injectable } from '@nestjs/common'
import { IReviewQueueRepository } from '../../domain/interfaces/review-queue-repository.interface'
import { IClinicalCaseRepository } from '../../../clinical-case/domain/interfaces/clinical-case-repository.interface'
import { ISpecialtyRepository } from '../../../clinical-case/domain/interfaces/specialty-repository.interface'
import { CaseGeneratorService } from '../../../clinical-case/infrastructure/services/case-generator.service'
import { DomainException } from '../../../../errors/domain-exception'

export interface RegenerateQueueItemInput {
  itemId: string
  userId: string
  role: string
}

@Injectable()
export class RegenerateQueueItem {
  constructor(
    @Inject('IReviewQueueRepository') private readonly queueRepo: IReviewQueueRepository,
    @Inject('IClinicalCaseRepository') private readonly caseRepo: IClinicalCaseRepository,
    @Inject('ISpecialtyRepository') private readonly specialtyRepo: ISpecialtyRepository,
    private readonly caseGeneratorService: CaseGeneratorService,
  ) {}

  async execute({ itemId, userId: _userId, role }: RegenerateQueueItemInput) {
    if (role !== 'reviewer' && role !== 'admin') {
      throw new DomainException('FORBIDDEN', 403)
    }

    const item = await this.queueRepo.findById(itemId)
    if (!item) {
      throw new DomainException('QUEUE_ITEM_NOT_FOUND', 404)
    }

    if (!item.canRegenerate()) {
      throw new DomainException('REGENERATION_LIMIT_REACHED', 409)
    }

    const clinicalCase = await this.caseRepo.findById(item.caseId)
    if (!clinicalCase) {
      throw new DomainException('CASE_NOT_FOUND', 404)
    }

    const specialty = await this.specialtyRepo.findById(clinicalCase.specialtyId)
    if (!specialty) {
      throw new DomainException('SPECIALTY_NOT_FOUND', 404)
    }

    item.regenerations += 1
    item.status = 'regenerating'
    await this.queueRepo.update(item)

    try {
      const generated = await this.caseGeneratorService.generate({
        specialtyName: clinicalCase.language === 'pt' ? specialty.namePt : specialty.nameEs,
        difficulty: clinicalCase.difficulty,
        language: clinicalCase.language,
        countryContext: clinicalCase.countryContext,
      })

      await this.caseRepo.updateContent(item.caseId, {
        caseBrief: {
          ...generated.case_brief,
          opening_message: generated.opening_message,
          patient_profile: generated.patient_profile,
        },
        availableExams: generated.available_exams as unknown as Record<string, unknown>,
      })

      item.status = 'pending'
      await this.queueRepo.update(item)
    } catch {
      item.status = 'pending'
      await this.queueRepo.update(item)
      throw new DomainException('GENERATION_FAILED', 500)
    }

    return {
      queueItem: { id: item.id, status: item.status, regenerations: item.regenerations },
      message: 'Regeneração concluída. O caso foi atualizado.',
    }
  }
}
