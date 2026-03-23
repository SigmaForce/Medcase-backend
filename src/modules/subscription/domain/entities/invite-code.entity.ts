import dayjs from 'dayjs'

export interface CreateInviteCodeProps {
  id?: string
  code: string
  createdById: string
  usedById?: string | null
  label?: string | null
  trialDays?: number
  expiresAt: Date
  usedAt?: Date | null
  createdAt?: Date
}

export class InviteCode {
  id: string
  code: string
  createdById: string
  usedById: string | null
  label: string | null
  trialDays: number
  expiresAt: Date
  usedAt: Date | null
  createdAt: Date

  static create(props: CreateInviteCodeProps): InviteCode {
    const invite = new InviteCode()
    invite.id = props.id ?? ''
    invite.code = props.code
    invite.createdById = props.createdById
    invite.usedById = props.usedById ?? null
    invite.label = props.label ?? null
    invite.trialDays = props.trialDays ?? 30
    invite.expiresAt = props.expiresAt
    invite.usedAt = props.usedAt ?? null
    invite.createdAt = props.createdAt ?? new Date()
    return invite
  }

  isValid(): boolean {
    return !this.usedAt && dayjs().isBefore(this.expiresAt)
  }
}
