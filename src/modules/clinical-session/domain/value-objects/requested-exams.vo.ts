export class RequestedExams {
  private readonly _slugs: string[]

  private constructor(slugs: string[]) {
    this._slugs = slugs
  }

  static create(slugs: string[]): RequestedExams {
    const unique = [...new Set(slugs.map((s) => s.trim().toLowerCase()).filter(Boolean))]
    return new RequestedExams(unique)
  }

  static empty(): RequestedExams {
    return new RequestedExams([])
  }

  merge(newSlugs: string[]): RequestedExams {
    const combined = [...this._slugs, ...newSlugs]
    return RequestedExams.create(combined)
  }

  get slugs(): string[] {
    return [...this._slugs]
  }

  includes(slug: string): boolean {
    return this._slugs.includes(slug.trim().toLowerCase())
  }

  get count(): number {
    return this._slugs.length
  }
}
