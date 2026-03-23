import { Injectable, UnauthorizedException } from '@nestjs/common'
import { MercadoPagoConfig, PreApproval, Payment } from 'mercadopago'
import * as crypto from 'crypto'
import { env } from '../../../../config/env'

export interface MpSubscriptionResult {
  url: string
  id: string
}

export interface MpWebhookVerifyParams {
  dataId: string
  xRequestId: string
  ts: string
  hash: string
}

@Injectable()
export class MercadoPagoAdapter {
  private readonly client = new MercadoPagoConfig({ accessToken: env.MP_ACCESS_TOKEN })

  async createSubscription(params: {
    userEmail: string
    userId: string
    successUrl: string
  }): Promise<MpSubscriptionResult> {
    const preApproval = new PreApproval(this.client)
    const result = await preApproval.create({
      body: {
        reason: 'RevalidAI Pro — acesso ilimitado',
        payer_email: params.userEmail,
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: 149000,
          currency_id: 'PYG',
        },
        back_url: params.successUrl,
        external_reference: params.userId,
      },
    })

    return {
      url: (result as { init_point?: string }).init_point ?? '',
      id: result.id ?? '',
    }
  }

  verifyWebhookSignature(params: MpWebhookVerifyParams): void {
    const { dataId, xRequestId, ts, hash } = params
    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`
    const computedHash = crypto
      .createHmac('sha256', env.MP_WEBHOOK_SECRET)
      .update(manifest)
      .digest('hex')

    if (computedHash !== hash) {
      throw new UnauthorizedException('INVALID_MP_SIGNATURE')
    }
  }

  async getPaymentStatus(paymentId: string): Promise<{ status: string; externalReference: string | null }> {
    const payment = new Payment(this.client)
    const result = await payment.get({ id: paymentId })
    return {
      status: result.status ?? 'unknown',
      externalReference: result.external_reference ?? null,
    }
  }
}
