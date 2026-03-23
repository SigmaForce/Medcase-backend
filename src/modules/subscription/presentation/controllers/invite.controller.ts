import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { AdminGuard } from '../../../../infra/http/guards/admin.guard'
import { CurrentUser, JwtPayload } from '../../../../infra/http/decorators/current-user.decorator'
import { CreateInviteCodes } from '../../application/use-cases/CreateInviteCodes'
import { ListInviteCodes } from '../../application/use-cases/ListInviteCodes'

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('admin/invite-codes')
export class InviteController {
  constructor(
    private readonly createInviteCodes: CreateInviteCodes,
    private readonly listInviteCodes: ListInviteCodes,
  ) {}

  @Post()
  async create(@CurrentUser() user: JwtPayload, @Body() body: unknown) {
    return this.createInviteCodes.execute({ createdById: user.sub, body })
  }

  @Get()
  async list() {
    return this.listInviteCodes.execute()
  }
}
