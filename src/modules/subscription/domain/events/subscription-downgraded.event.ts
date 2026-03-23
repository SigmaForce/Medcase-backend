export class SubscriptionDowngradedEvent {
  readonly name = 'subscription.downgraded'

  constructor(
    public readonly userId: string,
    public readonly provider: string,
  ) {}
}
