import { GET } from '@/app/api/health/route'
import { createMockRequest, extractResponseData, expectSuccessResponse } from '../utils/api-test-helpers'

describe('/api/health', () => {
  describe('GET', () => {
    it('should return 200 status', async () => {
      const request = createMockRequest('/api/health')
      const response = await GET(request)

      expectSuccessResponse(response)
      expect(response.status).toBe(200)
    })

    it('should return health status object', async () => {
      const request = createMockRequest('/api/health')
      const response = await GET(request)
      const data = await extractResponseData(response)

      expect(data).toHaveProperty('status')
      expect(data.status).toBe('healthy')
    })

    it('should return timestamp', async () => {
      const request = createMockRequest('/api/health')
      const response = await GET(request)
      const data = await extractResponseData(response)

      expect(data).toHaveProperty('timestamp')
      expect(typeof data.timestamp).toBe('string')
      expect(() => new Date(data.timestamp)).not.toThrow()
    })

    it('should return JSON content type', async () => {
      const request = createMockRequest('/api/health')
      const response = await GET(request)

      expect(response.headers.get('content-type')).toContain('application/json')
    })
  })
})
