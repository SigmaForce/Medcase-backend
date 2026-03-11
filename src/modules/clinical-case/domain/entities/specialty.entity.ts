export interface CreateSpecialtyProps {
  id?: number
  slug: string
  namePt: string
  nameEs: string
  icon?: string | null
}

export class Specialty {
  id: number
  slug: string
  namePt: string
  nameEs: string
  icon: string | null

  static create(props: CreateSpecialtyProps): Specialty {
    const specialty = new Specialty()
    specialty.id = props.id ?? 0
    specialty.slug = props.slug
    specialty.namePt = props.namePt
    specialty.nameEs = props.nameEs
    specialty.icon = props.icon ?? null
    return specialty
  }
}
