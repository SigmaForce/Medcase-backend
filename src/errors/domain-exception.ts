export class DomainException extends Error {
  constructor(
    public readonly code: string,
    public readonly statusCode: number = 400,
    public readonly detail?: string,
  ) {
    super(code)
    this.name = 'DomainException'
  }
}
