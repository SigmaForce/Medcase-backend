import { Body, Controller, Get, HttpCode, HttpStatus, Patch } from '@nestjs/common'
import { CurrentUser, JwtPayload } from '../../../../infra/http/decorators/current-user.decorator'
import { ZodValidationPipe } from '../../../../infra/http/pipes/zod-validation.pipe'
import { GetMe } from '../../application/use-cases/GetMe'
import { CompleteOnboarding } from '../../application/use-cases/CompleteOnboarding'
import { completeOnboardingSchema } from '../../application/dtos/complete-onboarding.dto'

@Controller('users')
export class UsersController {
  constructor(
    private readonly getMe: GetMe,
    private readonly completeOnboarding: CompleteOnboarding,
  ) {}

  @Get('me')
  @HttpCode(HttpStatus.OK)
  async me(@CurrentUser() user: JwtPayload) {
    return this.getMe.execute(user.sub)
  }

  @Patch('me/onboarding')
  @HttpCode(HttpStatus.OK)
  async onboarding(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(completeOnboardingSchema)) body: unknown,
  ) {
    const data = body as { country: string; university: string }
    return this.completeOnboarding.execute({ userId: user.sub, ...data })
  }
}
