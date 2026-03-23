import { Controller, Headers, Post, RawBodyRequest, Req } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { Request } from 'express'
import { Public } from '../../../../infra/http/decorators/public.decorator'
import { HandleStripeWebhook } from '../../application/use-cases/HandleStripeWebhook'
import { HandleMpWebhook } from '../../application/use-cases/HandleMpWebhook'

@ApiTags('webhooks')
@Public()
@Controller('webhooks')
export class WebhookController {
  constructor(
    private readonly handleStripeWebhook: HandleStripeWebhook,
    private readonly handleMpWebhook: HandleMpWebhook,
  ) {}

  @Post('stripe')
  async stripe(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    await this.handleStripeWebhook.execute({
      rawBody: req.rawBody ?? Buffer.alloc(0),
      signature,
    })
    return { received: true }
  }

  @Post('mercadopago')
  async mercadopago(
    @Req() req: Request,
    @Headers() headers: Record<string, string>,
  ) {
    await this.handleMpWebhook.execute({
      body: req.body as Record<string, unknown>,
      headers,
    })
    return { received: true }
  }
}
