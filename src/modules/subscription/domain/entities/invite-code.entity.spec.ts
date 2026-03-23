import dayjs from 'dayjs'
import { InviteCode } from './invite-code.entity'

describe('InviteCode', () => {
  describe('create', () => {
    it('should create an invite code with provided props', () => {
      const expiresAt = dayjs().add(30, 'day').toDate()
      const invite = InviteCode.create({
        code: 'BETA-AABBCC',
        createdById: 'admin-1',
        label: 'Turma 2026',
        trialDays: 14,
        expiresAt,
      })

      expect(invite.code).toBe('BETA-AABBCC')
      expect(invite.createdById).toBe('admin-1')
      expect(invite.label).toBe('Turma 2026')
      expect(invite.trialDays).toBe(14)
      expect(invite.expiresAt).toEqual(expiresAt)
      expect(invite.usedAt).toBeNull()
      expect(invite.usedById).toBeNull()
    })

    it('should default trialDays to 30 when not provided', () => {
      const invite = InviteCode.create({
        code: 'BETA-123456',
        createdById: 'admin-1',
        expiresAt: dayjs().add(7, 'day').toDate(),
      })

      expect(invite.trialDays).toBe(30)
    })
  })

  describe('isValid', () => {
    it('should return true when not used and not expired', () => {
      const invite = InviteCode.create({
        code: 'BETA-VALID1',
        createdById: 'admin-1',
        expiresAt: dayjs().add(7, 'day').toDate(),
      })

      expect(invite.isValid()).toBe(true)
    })

    it('should return false when already used (usedAt set)', () => {
      const invite = InviteCode.create({
        code: 'BETA-USED11',
        createdById: 'admin-1',
        expiresAt: dayjs().add(7, 'day').toDate(),
        usedAt: new Date(),
      })

      expect(invite.isValid()).toBe(false)
    })

    it('should return false when expired (expiresAt in the past)', () => {
      const invite = InviteCode.create({
        code: 'BETA-EXPIRD',
        createdById: 'admin-1',
        expiresAt: dayjs().subtract(1, 'day').toDate(),
      })

      expect(invite.isValid()).toBe(false)
    })

    it('should return false when both used and expired', () => {
      const invite = InviteCode.create({
        code: 'BETA-BOTH11',
        createdById: 'admin-1',
        expiresAt: dayjs().subtract(1, 'day').toDate(),
        usedAt: new Date(),
      })

      expect(invite.isValid()).toBe(false)
    })
  })
})
