import { RequestedExams } from './requested-exams.vo'

describe('RequestedExams', () => {
  it('creates empty set', () => {
    const re = RequestedExams.empty()
    expect(re.count).toBe(0)
    expect(re.slugs).toEqual([])
  })

  it('creates from slug list, deduplicating', () => {
    const re = RequestedExams.create(['hemograma', 'ecg', 'hemograma'])
    expect(re.count).toBe(2)
    expect(re.slugs).toContain('hemograma')
    expect(re.slugs).toContain('ecg')
  })

  it('normalizes slugs to lowercase and trims whitespace', () => {
    const re = RequestedExams.create(['  Hemograma ', 'ECG'])
    expect(re.includes('hemograma')).toBe(true)
    expect(re.includes('ecg')).toBe(true)
  })

  it('filters out empty strings', () => {
    const re = RequestedExams.create(['hemograma', '', '  '])
    expect(re.count).toBe(1)
  })

  it('merges with new slugs, keeping uniqueness', () => {
    const re = RequestedExams.create(['hemograma'])
    const merged = re.merge(['ecg', 'hemograma'])
    expect(merged.count).toBe(2)
    expect(merged.slugs).toContain('ecg')
  })

  it('includes returns true for existing slug', () => {
    const re = RequestedExams.create(['troponina'])
    expect(re.includes('troponina')).toBe(true)
    expect(re.includes('ecg')).toBe(false)
  })

  it('slugs getter returns immutable copy', () => {
    const re = RequestedExams.create(['hemograma'])
    const slugs = re.slugs
    slugs.push('tampered')
    expect(re.count).toBe(1)
  })
})
