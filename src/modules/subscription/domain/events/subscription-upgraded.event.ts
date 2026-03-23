export class SubscriptionUpgradedEvent {
  readonly name = 'subscription.upgraded'

  constructor(
    public readonly userId: string,
    public readonly provider: string,
    public readonly trialUsed: boolean = false,
  ) {}
}
