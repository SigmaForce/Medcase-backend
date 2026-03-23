import { Inject, Injectable } from '@nestjs/common'
import * as crypto from 'crypto'
import dayjs from 'dayjs'
import { IInviteCodeRepository } from '../../domain/interfaces/invite-code-repository.interface'
import { InviteCode } from '../../domain/entities/invite-code.entity'
import { createInviteCodesSchema, CreateInviteCodesDto } from '../dtos/create-invite-codes.dto'

export interface CreateInviteCodesInput {
  createdById: string
  body: unknown
}

export interface CreateInviteCodesOutput {
  codes: string[]
  total: number
  label: string
}

@Injectable()
export class CreateInviteCodes {
  constructor(
    @Inject('IInviteCodeRepository')
    private readonly inviteCodeRepo: IInviteCodeRepository,
  ) {}

  async execute({ createdById, body }: CreateInviteCodesInput): Promise<CreateInviteCodesOutput> {
    const dto = createInviteCodesSchema.parse(body) as CreateInviteCodesDto
    const expiresAt = dayjs(dto.expires_at).endOf('day').toDate()

    const codes = Array.from({ length: dto.quantity }, () => this.generateCode())

    const invites = codes.map((code) =>
      InviteCode.create({
        code,
        createdById,
        label: dto.label,
        trialDays: dto.trial_days,
        expiresAt,
      }),
    )

    await this.inviteCodeRepo.createBatch(invites)

    return { codes, total: dto.quantity, label: dto.label }
  }

  private generateCode(): string {
    return `BETA-${crypto.randomBytes(3).toString('hex').toUpperCase()}`
  }
}
