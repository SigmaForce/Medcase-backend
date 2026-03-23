import { Inject, Injectable } from '@nestjs/common'
import { IInviteCodeRepository, InviteGroupSummary } from '../../domain/interfaces/invite-code-repository.interface'

@Injectable()
export class ListInviteCodes {
  constructor(
    @Inject('IInviteCodeRepository')
    private readonly inviteCodeRepo: IInviteCodeRepository,
  ) {}

  async execute(): Promise<{ data: InviteGroupSummary[] }> {
    const data = await this.inviteCodeRepo.listGroupedByLabel()
    return { data }
  }
}
