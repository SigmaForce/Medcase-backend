const mockCapture = jest.fn()
const mockShutdown = jest.fn().mockResolvedValue(undefined)

jest.mock('posthog-node', () => ({
  PostHog: jest.fn().mockImplementation(() => ({
    capture: mockCapture,
    shutdown: mockShutdown,
  })),
}))

jest.mock('../../../../config/env', () => ({
  env: {
    POSTHOG_API_KEY: 'test-api-key',
    POSTHOG_HOST: 'https://app.posthog.com',
  },
}))

import { PostHogService } from './posthog.service'

describe('PostHogService', () => {
  let service: PostHogService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new PostHogService()
  })

  describe('track', () => {
    it('should call client.capture with correct arguments', () => {
      service.track('user-1', 'test_event', { key: 'value' })

      expect(mockCapture).toHaveBeenCalledWith({
        distinctId: 'user-1',
        event: 'test_event',
        properties: { key: 'value' },
      })
    })

    it('should call client.capture without properties when not provided', () => {
      service.track('user-2', 'another_event')

      expect(mockCapture).toHaveBeenCalledWith({
        distinctId: 'user-2',
        event: 'another_event',
        properties: undefined,
      })
    })

    it('should not throw even if capture throws', () => {
      mockCapture.mockImplementationOnce(() => {
        throw new Error('PostHog error')
      })

      expect(() => service.track('user-3', 'failing_event')).not.toThrow()
    })
  })

  describe('onModuleDestroy', () => {
    it('should call client.shutdown', async () => {
      await service.onModuleDestroy()

      expect(mockShutdown).toHaveBeenCalledTimes(1)
    })
  })
})
