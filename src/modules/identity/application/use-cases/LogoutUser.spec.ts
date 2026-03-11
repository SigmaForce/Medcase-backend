import { LogoutUser } from './LogoutUser'

const mockRefreshTokenRepo = {
  deleteAllByUserId: jest.fn(),
}

describe('LogoutUser', () => {
  let useCase: LogoutUser

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new LogoutUser(mockRefreshTokenRepo as any)
  })

  it('calls deleteAllByUserId with the given userId', async () => {
    mockRefreshTokenRepo.deleteAllByUserId.mockResolvedValue(undefined)
    await useCase.execute('user-123')
    expect(mockRefreshTokenRepo.deleteAllByUserId).toHaveBeenCalledWith('user-123')
  })
})
