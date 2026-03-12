import { Inject, Injectable } from '@nestjs/common'
import { ISessionRepository } from '../../domain/interfaces/session-repository.interface'
import { DomainException } from '../../../../errors/domain-exception'
import { completeSessionSchema } from '../dtos/complete-session.dto'
import { FeedbackGeneratorService } from '../../infrastructure/services/feedback-generator.service'
import { PerformanceUpdaterService } from '../../infrastructure/services/performance-updater.service'
import { StreakUpdaterService } from '../../infrastructure/services/streak-updater.service'
import { BadgeAwarderService } from '../../infrastructure/services/badge-awarder.service'
import { Exam } from '../../../clinical-case/domain/value-objects/available-exams.vo'

export interface CompleteSessionInput {
  sessionId: string
  userId: string
  submittedDiagnosis: string
  submittedManagement: string
}

export interface CompleteSessionOutput {
  session: {
    id: string
    status: string
    completed_at: Date | null
    duration_secs: number | null
    submitted_diagnosis: string | null
    submitted_management: string | null
    missed_key_exams: string[]
  }
  feedback: Record<string, unknown>
  subscription_plan: string
}

@Injectable()
export class CompleteSession {
  constructor(
    @Inject('ISessionRepository') private readonly sessionRepo: ISessionRepository,
    private readonly feedbackGenerator: FeedbackGeneratorService,
    private readonly performanceUpdater: PerformanceUpdaterService,
    private readonly streakUpdater: StreakUpdaterService,
    private readonly badgeAwarder: BadgeAwarderService,
  ) {}

  async execute(input: CompleteSessionInput): Promise<CompleteSessionOutput> {
    const data = completeSessionSchema.parse({
      submitted_diagnosis: input.submittedDiagnosis,
      submitted_management: input.submittedManagement,
    })

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

    const clinicalCase = await this.sessionRepo.findCaseById(session.caseId)
    if (!clinicalCase) {
      throw new DomainException('CASE_NOT_FOUND', 404)
    }

    const subscription = await this.sessionRepo.getSubscription(input.userId)
    if (!subscription) {
      throw new DomainException('SUBSCRIPTION_NOT_FOUND', 404)
    }

    const messages = await this.sessionRepo.getMessages(input.sessionId)

    const availableExamsRaw = clinicalCase.availableExams as Record<string, unknown>
    const allExams: Exam[] = [
      ...((availableExamsRaw.laboratory as Exam[]) ?? []),
      ...((availableExamsRaw.imaging as Exam[]) ?? []),
      ...((availableExamsRaw.ecg as Exam[]) ?? []),
      ...((availableExamsRaw.other as Exam[]) ?? []),
    ]

    const keyExams = allExams.filter((e) => e.is_key)
    const missedKeyExams = keyExams
      .filter((e) => !session.requestedExams.includes(e.slug))
      .map((e) => e.slug)

    const brief = clinicalCase.caseBrief as Record<string, unknown>
    const feedback = await this.feedbackGenerator.generate({
      correctDiagnosis: brief.diagnosis as string,
      expectedManagement: brief.expected_management as string,
      keyFindings: (brief.key_findings as string[]) ?? [],
      keyExams: keyExams.map((e) => e.slug),
      submittedDiagnosis: data.submitted_diagnosis,
      submittedManagement: data.submitted_management,
      requestedExams: session.requestedExams,
      missedKeyExams,
      messages,
    })

    session.complete({
      submittedDiagnosis: data.submitted_diagnosis,
      submittedManagement: data.submitted_management,
      feedback: feedback as unknown as Record<string, unknown>,
      missedKeyExams,
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
    await this.badgeAwarder.award({ userId: input.userId, streak, scoreTotal: feedback.score_total })

    const feedbackResponse =
      subscription.plan === 'pro'
        ? (feedback as unknown as Record<string, unknown>)
        : {
            score_total: feedback.score_total,
            correct_diagnosis: feedback.correct_diagnosis,
          }

    return {
      session: {
        id: updatedSession.id,
        status: updatedSession.status,
        completed_at: updatedSession.completedAt,
        duration_secs: updatedSession.durationSecs,
        submitted_diagnosis: updatedSession.submittedDiagnosis,
        submitted_management: updatedSession.submittedManagement,
        missed_key_exams: updatedSession.missedKeyExams,
      },
      feedback: feedbackResponse,
      subscription_plan: subscription.plan,
    }
  }
}
