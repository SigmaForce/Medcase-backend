import { RedeemInviteCode } from './RedeemInviteCode'
import { DomainException } from '../../../../errors/domain-exception'
import { Subscription } from '../../domain/entities/subscription.entity'
import { InviteCode } from '../../domain/entities/invite-code.entity'

const mockSubscriptionRepo = {
  findByUserId: jest.fn(),
  update: jest.fn(),
}

const mockInviteCodeRepo = {
  findValid: jest.fn(),
  markAsUsed: jest.fn(),
}

const mockEventEmitter = {
  emit: jest.fn(),
}

const makeFreeSubscription = (): Subscription => {
  const sub = Subscription.createFree('user-1')
  sub.id = 'sub-id-1'
  return sub
}

const makeProSubscription = (): Subscription => {
  const sub = Subscription.createFree('user-1')
  sub.id = 'sub-id-1'
  sub.plan = 'pro'
  sub.status = 'active'
  return sub
}

const makeInviteCode = (): InviteCode => {
  return InviteCode.create({
    code: 'BETA-ABC123',
    createdById: 'admin-id',
    label: 'Beta Launch',
    trialDays: 30,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  })
}

describe('RedeemInviteCode', () => {
  let useCase: RedeemInviteCode

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new RedeemInviteCode(
      mockSubscriptionRepo as never,
      mockInviteCodeRepo as never,
      mockEventEmitter as never,
    )
  })

  it('should throw INVITE_CODE_INVALID when code is not found or expired', async () => {
    mockInviteCodeRepo.findValid.mockResolvedValue(null)

    await expect(
      useCase.execute({ userId: 'user-1', body: { code: 'BETA-INVALID' } }),
    ).rejects.toMatchObject({ code: 'INVITE_CODE_INVALID' })

    expect(mockSubscriptionRepo.findByUserId).not.toHaveBeenCalled()
  })

  it('should throw SUBSCRIPTION_NOT_FOUND when subscription does not exist', async () => {
    mockInviteCodeRepo.findValid.mockResolvedValue(makeInviteCode())
    mockSubscriptionRepo.findByUserId.mockResolvedValue(null)

    await expect(
      useCase.execute({ userId: 'user-1', body: { code: 'BETA-ABC123' } }),
    ).rejects.toMatchObject({ code: 'SUBSCRIPTION_NOT_FOUND' })
  })

  it('should throw ALREADY_PRO when subscription is already pro and active', async () => {
    mockInviteCodeRepo.findValid.mockResolvedValue(makeInviteCode())
    mockSubscriptionRepo.findByUserId.mockResolvedValue(makeProSubscription())

    await expect(
      useCase.execute({ userId: 'user-1', body: { code: 'BETA-ABC123' } }),
    ).rejects.toMatchObject({ code: 'ALREADY_PRO' })

    expect(mockSubscriptionRepo.update).not.toHaveBeenCalled()
    expect(mockInviteCodeRepo.markAsUsed).not.toHaveBeenCalled()
  })

  it('should upgrade subscription, mark code as used and emit event on success', async () => {
    const inviteCode = makeInviteCode()
    const subscription = makeFreeSubscription()

    mockInviteCodeRepo.findValid.mockResolvedValue(inviteCode)
    mockSubscriptionRepo.findByUserId.mockResolvedValue(subscription)
    mockSubscriptionRepo.update.mockResolvedValue(subscription)
    mockInviteCodeRepo.markAsUsed.mockResolvedValue(undefined)

    const result = await useCase.execute({ userId: 'user-1', body: { code: 'BETA-ABC123' } })

    expect(mockSubscriptionRepo.update).toHaveBeenCalledWith(
      expect.objectContaining({ plan: 'pro', status: 'trial', provider: 'invite' }),
    )
    expect(mockInviteCodeRepo.markAsUsed).toHaveBeenCalledWith(inviteCode.id, 'user-1')
    expect(mockEventEmitter.emit).toHaveBeenCalledWith(
      'subscription.upgraded',
      expect.objectContaining({ userId: 'user-1', provider: 'invite', trialUsed: true }),
    )
    expect(result.plan).toBe('pro')
    expect(result.cases_limit).toBe(999)
    expect(result.generations_limit).toBe(999)
    expect(result.trial_ends_at).toBeInstanceOf(Date)
  })

  it('should throw on invalid body (zod validation)', async () => {
    await expect(
      useCase.execute({ userId: 'user-1', body: { code: '' } }),
    ).rejects.toThrow()
  })
})
