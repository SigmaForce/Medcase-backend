import { Controller, Get, Patch, Param, ParseUUIDPipe, Query, HttpCode, HttpStatus, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { CurrentUser, JwtPayload } from '../../../../infra/http/decorators/current-user.decorator'
import { ZodValidationPipe } from '../../../../infra/http/pipes/zod-validation.pipe'
import { ListReviewQueue } from '../../application/use-cases/ListReviewQueue'
import { ApproveQueueItem } from '../../application/use-cases/ApproveQueueItem'
import { RejectQueueItem } from '../../application/use-cases/RejectQueueItem'
import { RegenerateQueueItem } from '../../application/use-cases/RegenerateQueueItem'
import { listQueueSchema, ListQueueDto } from '../../application/dtos/list-queue.dto'
import { AdminGuard } from '../../../../infra/http/guards/admin.guard'

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('admin/review-queue')
export class ReviewQueueController {
  constructor(
    private readonly listReviewQueue: ListReviewQueue,
    private readonly approveQueueItem: ApproveQueueItem,
    private readonly rejectQueueItem: RejectQueueItem,
    private readonly regenerateQueueItem: RegenerateQueueItem,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async list(
    @Query(new ZodValidationPipe(listQueueSchema)) query: ListQueueDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.listReviewQueue.execute({ role: user.role, ...query })
  }

  @Patch(':id/approve')
  @HttpCode(HttpStatus.OK)
  async approve(@Param('id', ParseUUIDPipe) itemId: string, @CurrentUser() user: JwtPayload) {
    return this.approveQueueItem.execute({ itemId, userId: user.sub, role: user.role })
  }

  @Patch(':id/reject')
  @HttpCode(HttpStatus.OK)
  async reject(@Param('id', ParseUUIDPipe) itemId: string, @CurrentUser() user: JwtPayload) {
    return this.rejectQueueItem.execute({ itemId, userId: user.sub, role: user.role })
  }

  @Patch(':id/regenerate')
  @HttpCode(HttpStatus.OK)
  async regenerate(@Param('id', ParseUUIDPipe) itemId: string, @CurrentUser() user: JwtPayload) {
    return this.regenerateQueueItem.execute({ itemId, userId: user.sub, role: user.role })
  }
}
