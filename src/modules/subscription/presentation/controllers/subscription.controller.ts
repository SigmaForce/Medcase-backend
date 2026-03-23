import { Body, Controller, Get, Post } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { CurrentUser, JwtPayload } from '../../../../infra/http/decorators/current-user.decorator'
import { ZodValidationPipe } from '../../../../infra/http/pipes/zod-validation.pipe'
import { GetMySubscription } from '../../application/use-cases/GetMySubscription'
import { CreateCheckout } from '../../application/use-cases/CreateCheckout'
import { GetPortalUrl } from '../../application/use-cases/GetPortalUrl'
import { RedeemInviteCode } from '../../application/use-cases/RedeemInviteCode'
import { createCheckoutSchema } from '../../application/dtos/create-checkout.dto'
import { redeemInviteSchema } from '../../application/dtos/redeem-invite.dto'

@ApiTags('subscriptions')
@ApiBearerAuth()
@Controller('subscriptions')
export class SubscriptionController {
  constructor(
    private readonly getMySubscription: GetMySubscription,
    private readonly createCheckout: CreateCheckout,
    private readonly getPortalUrl: GetPortalUrl,
    private readonly redeemInviteCode: RedeemInviteCode,
  ) {}

  @Get('me')
  async me(@CurrentUser() user: JwtPayload) {
    return this.getMySubscription.execute({ userId: user.sub })
  }

  @Post('checkout')
  async checkout(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(createCheckoutSchema)) body: unknown,
  ) {
    return this.createCheckout.execute({ userId: user.sub, body })
  }

  @Post('portal')
  async portal(@CurrentUser() user: JwtPayload) {
    return this.getPortalUrl.execute({ userId: user.sub })
  }

  @Post('redeem')
  async redeem(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(redeemInviteSchema)) body: unknown,
  ) {
    return this.redeemInviteCode.execute({ userId: user.sub, body })
  }
}
