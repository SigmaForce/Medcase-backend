export class PaymentFailedEvent {
  readonly name = 'payment.failed'

  constructor(
    public readonly userId: string,
    public readonly provider: string,
  ) {}
}
