import { Inject, Injectable, Logger } from '@nestjs/common'
import { IClinicalCaseRepository } from '../../domain/interfaces/clinical-case-repository.interface'
import { ISpecialtyRepository } from '../../domain/interfaces/specialty-repository.interface'
import { ISubscriptionRepository } from '../../../subscription/domain/interfaces/subscription-repository.interface'
import { IReviewQueueRepository } from '../../../curation/domain/interfaces/review-queue-repository.interface'
import { ReviewQueueItem } from '../../../curation/domain/entities/review-queue-item.entity'
import { ClinicalCase, CaseDifficulty, CaseLanguage, CountryContext } from '../../domain/entities/clinical-case.entity'
import { RevalidaCaseGeneratorService } from '../../infrastructure/services/revalida-case-generator.service'
import { DomainException } from '../../../../errors/domain-exception'
import { Subscription } from '../../../subscription/domain/entities/subscription.entity'
import { z } from 'zod'

const attentionLevelValues = ['primaria', 'secundaria', 'terciaria'] as const

export const generateRevalidaCaseSchema = z.object({
  specialty_id: z.coerce.number().int().positive(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  language: z.enum(['pt', 'es']),
  country_context: z.enum(['BR', 'PY']),
  attention_level: z.enum(attentionLevelValues).default('primaria'),
})

export type GenerateRevalidaCaseDto = z.infer<typeof generateRevalidaCaseSchema>

export interface GenerateRevalidaCaseInput {
  userId: string
  role: string
  specialtyId: number
  difficulty: CaseDifficulty
  language: CaseLanguage
  countryContext: CountryContext
  attentionLevel: 'primaria' | 'secundaria' | 'terciaria'
}

export interface GenerateRevalidaCaseOutput {
  case: {
    id: string
    title: string
    status: string
    opening_message: string
    message: string
  }
}

const isPlanAllowed = (subscription: Subscription | null, role: string): boolean => {
  if (role === 'admin') return true
  if (!subscription) return false
  return subscription.plan === 'pro' || subscription.plan === 'institutional'
}

@Injectable()
export class GenerateRevalidaCase {
  private readonly logger = new Logger(GenerateRevalidaCase.name)

  constructor(
    @Inject('IClinicalCaseRepository')
    private readonly caseRepo: IClinicalCaseRepository,
    @Inject('ISpecialtyRepository')
    private readonly specialtyRepo: ISpecialtyRepository,
    @Inject('ISubscriptionRepository')
    private readonly subscriptionRepo: ISubscriptionRepository,
    @Inject('IReviewQueueRepository')
    private readonly queueRepo: IReviewQueueRepository,
    private readonly revalidaCaseGeneratorService: RevalidaCaseGeneratorService,
  ) {}

  async execute(input: GenerateRevalidaCaseInput): Promise<GenerateRevalidaCaseOutput> {
    const subscription = await this.subscriptionRepo.findByUserId(input.userId)

    if (!isPlanAllowed(subscription, input.role)) {
      throw new DomainException('PLAN_REQUIRED', 403)
    }

    if (subscription && subscription.generationsUsed >= subscription.generationsLimit) {
      throw new DomainException(
        'GENERATION_LIMIT_REACHED',
        429,
        JSON.stringify({ reset_at: subscription.usageResetAt }),
      )
    }

    const specialty = await this.specialtyRepo.findById(input.specialtyId)
    if (!specialty) {
      throw new DomainException('INVALID_SPECIALTY', 400)
    }

    if (subscription) {
      subscription.generationsUsed += 1
      await this.subscriptionRepo.update(subscription)
    }

    let generatedData: Awaited<ReturnType<RevalidaCaseGeneratorService['generate']>>
    try {
      generatedData = await this.revalidaCaseGeneratorService.generate({
        specialtyName: input.language === 'pt' ? specialty.namePt : specialty.nameEs,
        specialtyArea: input.language === 'pt' ? specialty.namePt : specialty.nameEs,
        difficulty: input.difficulty,
        language: input.language,
        countryContext: input.countryContext,
        attentionLevel: input.attentionLevel,
      })
    } catch (err) {
      this.logger.error('Revalida generation error', {
        userId: input.userId,
        specialtyId: input.specialtyId,
        error: err,
      })
      if (subscription) {
        subscription.generationsUsed -= 1
        await this.subscriptionRepo.update(subscription)
      }
      throw new DomainException('REVALIDA_GENERATION_FAILED', 500)
    }

    const { available_exams, ...caseBriefRest } = generatedData.case_brief

    const clinicalCase = ClinicalCase.create({
      specialtyId: input.specialtyId,
      createdById: input.userId,
      title: generatedData.title,
      difficulty: input.difficulty,
      language: input.language,
      countryContext: input.countryContext,
      status: 'pending_review',
      caseBrief: {
        ...caseBriefRest,
        opening_message: generatedData.opening_message,
        station_instructions: generatedData.station_instructions,
        patient_profile: generatedData.patient_profile,
        case_mode: 'revalida',
      },
      availableExams: (available_exams ?? {}) as Record<string, unknown>,
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
        opening_message: generatedData.opening_message,
        message: 'Estação Revalida gerada e submetida para revisão.',
      },
    }
  }
}
