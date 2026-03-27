import { Inject, Injectable, Logger } from '@nestjs/common'
import { IClinicalCaseRepository } from '../../domain/interfaces/clinical-case-repository.interface'
import { ISpecialtyRepository } from '../../domain/interfaces/specialty-repository.interface'
import { ISubscriptionRepository } from '../../../subscription/domain/interfaces/subscription-repository.interface'
import { IReviewQueueRepository } from '../../../curation/domain/interfaces/review-queue-repository.interface'
import { ReviewQueueItem } from '../../../curation/domain/entities/review-queue-item.entity'
import { ClinicalCase, CaseDifficulty, CaseLanguage, CountryContext } from '../../domain/entities/clinical-case.entity'
import { CaseGeneratorService } from '../../infrastructure/services/case-generator.service'
import { DomainException } from '../../../../errors/domain-exception'
import { Subscription } from '../../../subscription/domain/entities/subscription.entity'

export interface GenerateCaseInput {
  userId: string
  role: string
  specialtyId: number
  difficulty: CaseDifficulty
  language: CaseLanguage
  countryContext: CountryContext
}

export interface GenerateCaseOutput {
  case: {
    id: string
    title: string
    status: string
    openingMessage: string
    message: string
  }
}

const isPlanAllowed = (subscription: Subscription | null, role: string): boolean => {
  if (role === 'admin') return true
  if (!subscription) return false
  return subscription.plan === 'pro' || subscription.plan === 'institutional'
}

@Injectable()
export class GenerateCase {
  private readonly logger = new Logger(GenerateCase.name)

  constructor(
    @Inject('IClinicalCaseRepository')
    private readonly caseRepo: IClinicalCaseRepository,
    @Inject('ISpecialtyRepository')
    private readonly specialtyRepo: ISpecialtyRepository,
    @Inject('ISubscriptionRepository')
    private readonly subscriptionRepo: ISubscriptionRepository,
    @Inject('IReviewQueueRepository')
    private readonly queueRepo: IReviewQueueRepository,
    private readonly caseGeneratorService: CaseGeneratorService,
  ) {}

  async execute(input: GenerateCaseInput): Promise<GenerateCaseOutput> {
    const subscription = await this.subscriptionRepo.findByUserId(input.userId)

    if (!isPlanAllowed(subscription, input.role)) {
      throw new DomainException('PLAN_REQUIRED', 403)
    }

    if (
      subscription &&
      subscription.generationsUsed >= subscription.generationsLimit
    ) {
      throw new DomainException('GENERATION_LIMIT_REACHED', 429, JSON.stringify({
        reset_at: subscription.usageResetAt,
      }))
    }

    const specialty = await this.specialtyRepo.findById(input.specialtyId)
    if (!specialty) {
      throw new DomainException('INVALID_SPECIALTY', 400)
    }

    if (subscription) {
      subscription.generationsUsed += 1
      await this.subscriptionRepo.update(subscription)
    }

    let generatedData: Awaited<ReturnType<CaseGeneratorService['generate']>>
    try {
      generatedData = await this.caseGeneratorService.generate({
        specialtyName: input.language === 'pt' ? specialty.namePt : specialty.nameEs,
        difficulty: input.difficulty,
        language: input.language,
        countryContext: input.countryContext,
      })
    } catch (err) {
      this.logger.error('Generation error', { userId: input.userId, specialtyId: input.specialtyId, error: err })
      if (subscription) {
        subscription.generationsUsed -= 1
        await this.subscriptionRepo.update(subscription)
      }
      throw new DomainException('GENERATION_FAILED', 500)
    }

    const clinicalCase = ClinicalCase.create({
      specialtyId: input.specialtyId,
      createdById: input.userId,
      title: generatedData.title,
      difficulty: input.difficulty,
      language: input.language,
      countryContext: input.countryContext,
      status: 'pending_review',
      caseBrief: {
        ...generatedData.case_brief,
        opening_message: generatedData.opening_message,
        patient_profile: generatedData.patient_profile,
      },
      availableExams: generatedData.available_exams as unknown as Record<string, unknown>,
      generationPrompt: null,
    })

    const saved = await this.caseRepo.create(clinicalCase)

    const queueItem = ReviewQueueItem.create({ caseId: saved.id, status: 'pending' })
    await this.queueRepo.create(queueItem)

    return {
      case: {
        id: saved.id,
        title: saved.title,
        status: saved.status,
        openingMessage: generatedData.opening_message,
        message: 'Case generated and submitted for review.',
      },
    }
  }
}
