import { Specialty } from './specialty.entity'

describe('Specialty', () => {
  it('creates a specialty with all props', () => {
    const specialty = Specialty.create({
      id: 1,
      slug: 'cardiologia',
      namePt: 'Cardiologia',
      nameEs: 'Cardiología',
      icon: 'heart',
    })

    expect(specialty.id).toBe(1)
    expect(specialty.slug).toBe('cardiologia')
    expect(specialty.namePt).toBe('Cardiologia')
    expect(specialty.nameEs).toBe('Cardiología')
    expect(specialty.icon).toBe('heart')
  })

  it('defaults id to 0 when not provided', () => {
    const specialty = Specialty.create({
      slug: 'pediatria',
      namePt: 'Pediatria',
      nameEs: 'Pediatría',
    })
    expect(specialty.id).toBe(0)
  })

  it('defaults icon to null when not provided', () => {
    const specialty = Specialty.create({
      id: 2,
      slug: 'pediatria',
      namePt: 'Pediatria',
      nameEs: 'Pediatría',
    })
    expect(specialty.icon).toBeNull()
  })
})
