import { UpdateProfile } from './UpdateProfile'
import { DomainException } from '../../../../errors/domain-exception'
import { User } from '../../domain/entities/user.entity'

const mockUserRepo = {
  findById: jest.fn(),
  update: jest.fn(),
}

const makeUser = (): User =>
  User.create({
    id: 'user-1',
    email: 'test@example.com',
    passwordHash: 'hash',
    fullName: 'João Silva',
    country: 'BR',
    university: 'UFMS',
  })

describe('UpdateProfile', () => {
  let useCase: UpdateProfile

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new UpdateProfile(mockUserRepo as never)
  })

  it('should update fullName only', async () => {
    const user = makeUser()
    mockUserRepo.findById.mockResolvedValue(user)
    mockUserRepo.update.mockResolvedValue(user)

    const result = await useCase.execute({ userId: 'user-1', body: { full_name: 'Maria Souza' } })

    expect(result.fullName).toBe('Maria Souza')
    expect(result.country).toBe('BR')
    expect(result.university).toBe('UFMS')
    expect(mockUserRepo.update).toHaveBeenCalledWith(expect.objectContaining({ fullName: 'Maria Souza' }))
  })

  it('should update country and university', async () => {
    const user = makeUser()
    mockUserRepo.findById.mockResolvedValue(user)
    mockUserRepo.update.mockResolvedValue(user)

    const result = await useCase.execute({ userId: 'user-1', body: { country: 'PY', university: 'UNA' } })

    expect(result.country).toBe('PY')
    expect(result.university).toBe('UNA')
    expect(mockUserRepo.update).toHaveBeenCalled()
  })

  it('should throw USER_NOT_FOUND when user does not exist', async () => {
    mockUserRepo.findById.mockResolvedValue(null)

    await expect(
      useCase.execute({ userId: 'user-1', body: { full_name: 'Novo Nome' } }),
    ).rejects.toMatchObject({ code: 'USER_NOT_FOUND' })

    expect(mockUserRepo.update).not.toHaveBeenCalled()
  })

  it('should not update fields not present in body (partial update)', async () => {
    const user = makeUser()
    mockUserRepo.findById.mockResolvedValue(user)
    mockUserRepo.update.mockResolvedValue(user)

    await useCase.execute({ userId: 'user-1', body: { university: 'UEMS' } })

    expect(mockUserRepo.update).toHaveBeenCalledWith(
      expect.objectContaining({ fullName: 'João Silva', country: 'BR', university: 'UEMS' }),
    )
  })

  it('should accept empty body without error', async () => {
    const user = makeUser()
    mockUserRepo.findById.mockResolvedValue(user)
    mockUserRepo.update.mockResolvedValue(user)

    const result = await useCase.execute({ userId: 'user-1', body: {} })

    expect(result.fullName).toBe('João Silva')
    expect(mockUserRepo.update).toHaveBeenCalled()
  })

  it('should throw on invalid country', async () => {
    await expect(
      useCase.execute({ userId: 'user-1', body: { country: 'US' } }),
    ).rejects.toThrow()
  })
})
