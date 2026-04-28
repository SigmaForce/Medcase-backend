import { ClinicalSession } from '../entities/clinical-session.entity'
import { MessageTurn } from '../entities/message-turn.entity'

export interface FeedbackData {
  scoreTotal: number
  dimensions: {
    history_taking: { score: number; analysis: string }
    differential: { score: number; analysis: string }
    diagnosis: { score: number; analysis: string }
    exams: { score: number; analysis: string }
    management: { score: number; analysis: string }
  }
}

export interface SessionListFilters {
  status?: string
  page: number
  limit: number
}

export interface SessionListResult {
  sessions: ClinicalSession[]
  total: number
}

export interface ClinicalCaseRecord {
  id: string
  status: string
  specialtyId: number
  language: 'pt' | 'es'
  caseBrief: Record<string, unknown>
  availableExams: Record<string, unknown>
}

export interface SubscriptionRecord {
  plan: string
  casesLimit: number
  casesUsed: number
  usageResetAt: Date
}

export interface ISessionRepository {
  create(session: ClinicalSession): Promise<ClinicalSession>
  findById(id: string): Promise<ClinicalSession | null>
  findByUserAndCase(userId: string, caseId: string): Promise<ClinicalSession | null>
  findInProgressByUserAndCase(userId: string, caseId: string): Promise<ClinicalSession | null>
  findByUser(userId: string, filters: SessionListFilters): Promise<SessionListResult>
  update(session: ClinicalSession): Promise<ClinicalSession>
  addMessage(message: MessageTurn): Promise<MessageTurn>
  getMessages(sessionId: string): Promise<MessageTurn[]>
  countMessages(sessionId: string): Promise<number>
  updateRequestedExams(sessionId: string, slugs: string[]): Promise<void>
  findCaseById(caseId: string): Promise<ClinicalCaseRecord | null>
  getSubscription(userId: string): Promise<SubscriptionRecord | null>
  incrementCasesUsed(userId: string): Promise<void>
  upsertPerformance(params: {
    userId: string
    specialtyId: number
    feedback: FeedbackData
  }): Promise<void>
  findCompletedByUserAndCase(userId: string, caseId: string): Promise<boolean>
}
