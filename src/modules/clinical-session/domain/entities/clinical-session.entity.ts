import { DomainException } from '../../../../errors/domain-exception'

export type SessionStatusValue = 'in_progress' | 'completed' | 'abandoned'

export interface CreateClinicalSessionProps {
  id?: string
  userId: string
  caseId: string
  status?: SessionStatusValue
  submittedDiagnosis?: string | null
  submittedManagement?: string | null
  feedback?: Record<string, unknown> | null
  requestedExams?: string[]
  missedKeyExams?: string[]
  startedAt?: Date
  completedAt?: Date | null
  durationSecs?: number | null
  isTimed?: boolean
  timedLimitSecs?: number
  sessionType?: string
}

export class ClinicalSession {
  id: string
  userId: string
  caseId: string
  status: SessionStatusValue
  submittedDiagnosis: string | null
  submittedManagement: string | null
  feedback: Record<string, unknown> | null
  requestedExams: string[]
  missedKeyExams: string[]
  startedAt: Date
  completedAt: Date | null
  durationSecs: number | null
  isTimed: boolean
  timedLimitSecs: number
  sessionType: string

  static create(props: CreateClinicalSessionProps): ClinicalSession {
    if (!props.userId || !props.caseId) {
      throw new DomainException('INVALID_SESSION_PROPS', 400, 'userId and caseId are required')
    }

    const session = new ClinicalSession()
    session.id = props.id ?? ''
    session.userId = props.userId
    session.caseId = props.caseId
    session.status = props.status ?? 'in_progress'
    session.submittedDiagnosis = props.submittedDiagnosis ?? null
    session.submittedManagement = props.submittedManagement ?? null
    session.feedback = props.feedback ?? null
    session.requestedExams = props.requestedExams ?? []
    session.missedKeyExams = props.missedKeyExams ?? []
    session.startedAt = props.startedAt ?? new Date()
    session.completedAt = props.completedAt ?? null
    session.durationSecs = props.durationSecs ?? null
    session.isTimed = props.isTimed ?? false
    session.timedLimitSecs = props.timedLimitSecs ?? 2700
    session.sessionType = props.sessionType ?? 'study'
    return session
  }

  isInProgress(): boolean {
    return this.status === 'in_progress'
  }

  isCompleted(): boolean {
    return this.status === 'completed'
  }

  isAbandoned(): boolean {
    return this.status === 'abandoned'
  }

  complete({
    submittedDiagnosis,
    submittedManagement,
    feedback,
    missedKeyExams,
  }: {
    submittedDiagnosis: string
    submittedManagement: string
    feedback: Record<string, unknown>
    missedKeyExams: string[]
  }): void {
    if (!this.isInProgress()) {
      throw new DomainException('SESSION_ALREADY_COMPLETED', 400)
    }
    this.status = 'completed'
    this.submittedDiagnosis = submittedDiagnosis
    this.submittedManagement = submittedManagement
    this.feedback = feedback
    this.missedKeyExams = missedKeyExams
    this.completedAt = new Date()
    this.durationSecs = Math.floor((this.completedAt.getTime() - this.startedAt.getTime()) / 1000)
  }

  abandon(): void {
    this.status = 'abandoned'
  }
}
