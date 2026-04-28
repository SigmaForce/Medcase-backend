export class SubscriptionCancellationScheduledEvent {
  readonly name = 'subscription.cancellation.scheduled'

  constructor(
    public readonly userId: string,
    public readonly provider: string,
    public readonly cancelAt: Date,
  ) {}
}
