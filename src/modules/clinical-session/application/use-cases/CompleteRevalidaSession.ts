import { Inject, Injectable } from '@nestjs/common'
import { ISessionRepository } from '../../domain/interfaces/session-repository.interface'
import { DomainException } from '../../../../errors/domain-exception'
import { RevalidaFeedbackGeneratorService } from '../../infrastructure/services/revalida-feedback-generator.service'
import { PerformanceUpdaterService } from '../../infrastructure/services/performance-updater.service'
import { StreakUpdaterService } from '../../infrastructure/services/streak-updater.service'
import { BadgeAwarderService } from '../../infrastructure/services/badge-awarder.service'
import { PepItem } from '../../../clinical-case/infrastructure/services/revalida-case-generator.service'
import { RevalidaFeedbackResult } from '../../infrastructure/services/revalida-feedback-generator.service'

export interface CompleteRevalidaSessionInput {
  sessionId: string
  userId: string
  submittedDiagnosis: string
  submittedManagement: string
}

export interface CompleteRevalidaSessionOutput {
  session: {
    id: string
    status: string
    completed_at: Date | null
    duration_secs: number | null
  }
  feedback: Record<string, unknown>
  subscription_plan: string
}

@Injectable()
export class CompleteRevalidaSession {
  constructor(
    @Inject('ISessionRepository') private readonly sessionRepo: ISessionRepository,
    private readonly feedbackGenerator: RevalidaFeedbackGeneratorService,
    private readonly performanceUpdater: PerformanceUpdaterService,
    private readonly streakUpdater: StreakUpdaterService,
    private readonly badgeAwarder: BadgeAwarderService,
  ) {}

  async execute(input: CompleteRevalidaSessionInput): Promise<CompleteRevalidaSessionOutput> {
    const session = await this.sessionRepo.findById(input.sessionId)
    if (!session) {
      throw new DomainException('SESSION_NOT_FOUND', 404)
    }

    if (session.userId !== input.userId) {
      throw new DomainException('FORBIDDEN', 403)
    }

    if (!session.isInProgress()) {
      throw new DomainException('SESSION_ALREADY_COMPLETED', 400)
    }

    if (session.sessionType !== 'revalida') {
      throw new DomainException('NOT_A_REVALIDA_SESSION', 400)
    }

    const clinicalCase = await this.sessionRepo.findCaseById(session.caseId)
    if (!clinicalCase) {
      throw new DomainException('CASE_NOT_FOUND', 404)
    }

    const subscription = await this.sessionRepo.getSubscription(input.userId)
    if (!subscription) {
      throw new DomainException('SUBSCRIPTION_NOT_FOUND', 404)
    }

    const brief = clinicalCase.caseBrief as Record<string, unknown>
    const pep = (brief.pep as PepItem[]) ?? []
    if (pep.length === 0) {
      throw new DomainException('CASE_MISSING_PEP', 422)
    }

    const teachingPoints = (brief.teaching_points as string[]) ?? []
    const messages = await this.sessionRepo.getMessages(input.sessionId)

    const feedback = await this.feedbackGenerator.generate({
      correctDiagnosis: brief.diagnosis as string,
      expectedManagement: brief.expected_management as string,
      teachingPoints,
      pep,
      messages,
    })

    session.complete({
      submittedDiagnosis: input.submittedDiagnosis,
      submittedManagement: input.submittedManagement,
      feedback: feedback as unknown as Record<string, unknown>,
      missedKeyExams: [],
    })

    const updatedSession = await this.sessionRepo.update(session)

    await this.performanceUpdater.update({
      userId: input.userId,
      specialtyId: clinicalCase.specialtyId,
      feedback: {
        scoreTotal: feedback.score_total,
        dimensions: feedback.dimensions,
      },
    })

    const streak = await this.streakUpdater.update({ userId: input.userId })
    await this.badgeAwarder.award({
      userId: input.userId,
      streak,
      scoreTotal: feedback.score_total,
    })

    const feedbackResponse = this.buildFeedbackResponse(feedback, subscription.plan)

    return {
      session: {
        id: updatedSession.id,
        status: updatedSession.status,
        completed_at: updatedSession.completedAt,
        duration_secs: updatedSession.durationSecs,
      },
      feedback: feedbackResponse,
      subscription_plan: subscription.plan,
    }
  }

  private buildFeedbackResponse(
    feedback: RevalidaFeedbackResult,
    plan: string,
  ): Record<string, unknown> {
    if (plan === 'pro') {
      return feedback as unknown as Record<string, unknown>
    }

    return {
      score_total: feedback.score_total,
      max_score_total: feedback.max_score_total,
      correct_diagnosis: feedback.correct_diagnosis,
      strengths: feedback.strengths.slice(0, 1),
      improvements: feedback.improvements.slice(0, 1),
    }
  }
}
