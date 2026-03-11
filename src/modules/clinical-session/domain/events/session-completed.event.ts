export interface SessionCompletedPayload {
  sessionId: string
  userId: string
  caseId: string
  specialtyId: number
  scoreTotal: number
  completedAt: Date
}

export class SessionCompletedEvent {
  readonly name = 'session.completed'
  readonly occurredAt: Date

  constructor(public readonly payload: SessionCompletedPayload) {
    this.occurredAt = new Date()
  }
}
