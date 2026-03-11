import { ListSpecialties } from './ListSpecialties'
import { Specialty } from '../../domain/entities/specialty.entity'

const makeSpecialty = (id: number, slug: string) =>
  Specialty.create({ id, slug, namePt: `Especialidade ${id}`, nameEs: `Especialidad ${id}` })

const mockRepo = {
  findAll: jest.fn(),
  findById: jest.fn(),
}

describe('ListSpecialties', () => {
  let useCase: ListSpecialties

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new ListSpecialties(mockRepo as any)
  })

  it('returns all specialties', async () => {
    const specialties = [makeSpecialty(1, 'cardiologia'), makeSpecialty(2, 'pediatria')]
    mockRepo.findAll.mockResolvedValue(specialties)

    const result = await useCase.execute()

    expect(result).toHaveLength(2)
    expect(result[0].slug).toBe('cardiologia')
    expect(result[1].slug).toBe('pediatria')
    expect(mockRepo.findAll).toHaveBeenCalledTimes(1)
  })

  it('returns empty array when no specialties exist', async () => {
    mockRepo.findAll.mockResolvedValue([])

    const result = await useCase.execute()

    expect(result).toHaveLength(0)
  })
})
