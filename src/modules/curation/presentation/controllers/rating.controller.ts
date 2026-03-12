import { Controller, Post, Get, Param, Body, HttpCode, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { CurrentUser, JwtPayload } from '../../../../infra/http/decorators/current-user.decorator'
import { ZodValidationPipe } from '../../../../infra/http/pipes/zod-validation.pipe'
import { SubmitRating } from '../../application/use-cases/SubmitRating'
import { GetMyRating } from '../../application/use-cases/GetMyRating'
import { submitRatingSchema, SubmitRatingDto } from '../../application/dtos/submit-rating.dto'

@ApiTags('Curation')
@ApiBearerAuth()
@Controller('cases')
export class RatingController {
  constructor(
    private readonly submitRating: SubmitRating,
    private readonly getMyRating: GetMyRating,
  ) {}

  @Post(':id/ratings')
  @HttpCode(HttpStatus.CREATED)
  async submit(
    @Param('id') caseId: string,
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(submitRatingSchema)) body: SubmitRatingDto,
  ) {
    return this.submitRating.execute({
      caseId,
      userId: user.sub,
      score: body.score,
      issues: body.issues,
      comment: body.comment,
    })
  }

  @Get(':id/ratings/mine')
  @HttpCode(HttpStatus.OK)
  async mine(@Param('id') caseId: string, @CurrentUser() user: JwtPayload) {
    return this.getMyRating.execute({ caseId, userId: user.sub })
  }
}
