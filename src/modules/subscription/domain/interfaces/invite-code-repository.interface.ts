import { InviteCode } from '../entities/invite-code.entity'

export interface InviteGroupSummary {
  label: string | null
  total: number
  used: number
  remaining: number
}

export interface IInviteCodeRepository {
  findValid(code: string): Promise<InviteCode | null>
  markAsUsed(id: string, usedById: string): Promise<void>
  createBatch(codes: InviteCode[]): Promise<InviteCode[]>
  listGroupedByLabel(): Promise<InviteGroupSummary[]>
}
