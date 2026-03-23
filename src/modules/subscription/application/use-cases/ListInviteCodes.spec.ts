import { ListInviteCodes } from './ListInviteCodes'

const mockRepo = {
  listGroupedByLabel: jest.fn(),
}

describe('ListInviteCodes', () => {
  let useCase: ListInviteCodes

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new ListInviteCodes(mockRepo as never)
  })

  it('should return groups from the repository', async () => {
    const groups = [
      { label: 'Turma A', total: 10, used: 3 },
      { label: 'Turma B', total: 5, used: 5 },
    ]
    mockRepo.listGroupedByLabel.mockResolvedValue(groups)

    const result = await useCase.execute()

    expect(result.data).toEqual(groups)
    expect(mockRepo.listGroupedByLabel).toHaveBeenCalledTimes(1)
  })

  it('should return empty array when no groups exist', async () => {
    mockRepo.listGroupedByLabel.mockResolvedValue([])

    const result = await useCase.execute()

    expect(result.data).toEqual([])
  })
})
