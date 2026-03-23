import { calculateCostUsd, usdToBrl } from './cost-calculator'

describe('calculateCostUsd', () => {
  it('should calculate cost for gpt-4o with 1M input and 1M output tokens', () => {
    // input: (1_000_000 / 1_000_000) * 5.0 = $5.00
    // output: (1_000_000 / 1_000_000) * 15.0 = $15.00
    // total: $20.00
    const cost = calculateCostUsd('gpt-4o', 1_000_000, 1_000_000)
    expect(cost).toBeCloseTo(20.0, 5)
  })

  it('should calculate cost for gpt-4o-mini with 1M input and 1M output tokens', () => {
    // input: (1_000_000 / 1_000_000) * 0.15 = $0.15
    // output: (1_000_000 / 1_000_000) * 0.6 = $0.60
    // total: $0.75
    const cost = calculateCostUsd('gpt-4o-mini', 1_000_000, 1_000_000)
    expect(cost).toBeCloseTo(0.75, 5)
  })

  it('should use default pricing for unknown model', () => {
    // Default pricing is same as gpt-4o: 5.0 input, 15.0 output
    const cost = calculateCostUsd('unknown-model', 1_000_000, 1_000_000)
    expect(cost).toBeCloseTo(20.0, 5)
  })

  it('should return 0 when no tokens are used', () => {
    const cost = calculateCostUsd('gpt-4o', 0, 0)
    expect(cost).toBe(0)
  })

  it('should handle partial token counts', () => {
    // 500k input at gpt-4o: (500_000 / 1_000_000) * 5.0 = $2.50
    // 200k output: (200_000 / 1_000_000) * 15.0 = $3.00
    const cost = calculateCostUsd('gpt-4o', 500_000, 200_000)
    expect(cost).toBeCloseTo(5.5, 5)
  })
})

describe('usdToBrl', () => {
  it('should convert USD to BRL using default rate of 5.0', () => {
    const brl = usdToBrl(10)
    expect(brl).toBe(50)
  })

  it('should convert USD to BRL using a custom rate', () => {
    const brl = usdToBrl(10, 6.0)
    expect(brl).toBe(60)
  })

  it('should round to 2 decimal places', () => {
    // 1.337 * 5.0 = 6.685 → Math.round(668.5) / 100 = 6.69
    const brl = usdToBrl(1.337, 5.0)
    expect(brl).toBe(6.69)
  })

  it('should return 0 for 0 USD', () => {
    const brl = usdToBrl(0)
    expect(brl).toBe(0)
  })
})
