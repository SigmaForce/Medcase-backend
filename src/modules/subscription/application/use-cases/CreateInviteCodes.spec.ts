import { CreateInviteCodes } from './CreateInviteCodes'

const mockRepo = {
  createBatch: jest.fn(),
}

describe('CreateInviteCodes', () => {
  let useCase: CreateInviteCodes

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new CreateInviteCodes(mockRepo as never)
  })

  it('should create the correct number of invite codes', async () => {
    mockRepo.createBatch.mockResolvedValue(undefined)

    const result = await useCase.execute({
      createdById: 'admin-1',
      body: {
        quantity: 5,
        expires_at: '2030-12-31',
        trial_days: 14,
        label: 'Turma Beta',
      },
    })

    expect(result.codes).toHaveLength(5)
    expect(result.total).toBe(5)
    expect(result.label).toBe('Turma Beta')
  })

  it('should generate codes with BETA- prefix', async () => {
    mockRepo.createBatch.mockResolvedValue(undefined)

    const result = await useCase.execute({
      createdById: 'admin-1',
      body: {
        quantity: 3,
        expires_at: '2030-12-31',
        trial_days: 30,
        label: 'Test',
      },
    })

    for (const code of result.codes) {
      expect(code).toMatch(/^BETA-[A-F0-9]{6}$/)
    }
  })

  it('should call createBatch with the correct number of InviteCode entities', async () => {
    mockRepo.createBatch.mockResolvedValue(undefined)

    await useCase.execute({
      createdById: 'admin-1',
      body: {
        quantity: 2,
        expires_at: '2030-06-15',
        trial_days: 7,
        label: 'Promo',
      },
    })

    expect(mockRepo.createBatch).toHaveBeenCalledTimes(1)
    const [invites] = mockRepo.createBatch.mock.calls[0] as [unknown[]]
    expect(invites).toHaveLength(2)
  })

  it('should default trial_days to 30 when not provided', async () => {
    mockRepo.createBatch.mockResolvedValue(undefined)

    const result = await useCase.execute({
      createdById: 'admin-1',
      body: {
        quantity: 1,
        expires_at: '2030-12-31',
        label: 'Default Trial',
      },
    })

    expect(result.total).toBe(1)
    const [invites] = mockRepo.createBatch.mock.calls[0] as [Array<{ trialDays: number }>]
    expect(invites[0].trialDays).toBe(30)
  })

  it('should throw a ZodError for invalid body', async () => {
    await expect(
      useCase.execute({
        createdById: 'admin-1',
        body: { quantity: 0 },
      }),
    ).rejects.toThrow()
  })
})
