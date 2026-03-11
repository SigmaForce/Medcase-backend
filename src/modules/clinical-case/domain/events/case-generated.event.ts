export class CaseGeneratedEvent {
  readonly occurredAt: Date

  constructor(
    public readonly caseId: string,
    public readonly createdById: string,
    public readonly specialtyId: number,
    public readonly title: string,
  ) {
    this.occurredAt = new Date()
  }
}
