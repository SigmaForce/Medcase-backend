jest.mock('src/config/env', () => ({
  env: { NODE_ENV: 'test', OPENAI_API_KEY: 'test-key' },
}))

import { GenerateRevalidaCase } from './GenerateRevalidaCase'
import { Subscription } from '../../../subscription/domain/entities/subscription.entity'
import { Specialty } from '../../domain/entities/specialty.entity'
import { ClinicalCase } from '../../domain/entities/clinical-case.entity'

const makeSubscription = (
  plan: Subscription['plan'] = 'pro',
  generationsUsed = 0,
  generationsLimit = 10,
): Subscription => {
  const sub = new Subscription()
  sub.id = 'sub-1'
  sub.userId = 'user-1'
  sub.plan = plan
  sub.status = 'active'
  sub.casesLimit = 50
  sub.casesUsed = 0
  sub.generationsLimit = generationsLimit
  sub.generationsUsed = generationsUsed
  sub.usageResetAt = new Date(Date.now() + 86400000)
  sub.provider = null
  sub.externalSubId = null
  sub.createdAt = new Date()
  sub.updatedAt = new Date()
  return sub
}

const makeSpecialty = () =>
  Specialty.create({ id: 1, slug: 'cardiologia', namePt: 'Cardiologia', nameEs: 'Cardiología' })

const makeGeneratedData = () => ({
  title: 'Paciente com dispneia aguda',
  opening_message: 'Doutor, estou com falta de ar há algumas horas.',
  station_instructions: 'Você está em uma UBS. Atenda este paciente em 10 minutos.',
  case_brief: {
    diagnosis: 'Insuficiência Cardíaca Descompensada',
    differential: ['DPOC exacerbado', 'TEP'],
    expected_management: 'Diurético IV, oxigenioterapia, monitorização',
    pep: [{ step: 'Anamnese', points: 10 }, { step: 'Diagnóstico', points: 20 }],
    teaching_points: ['BNP é marcador de IC'],
    available_exams: {
      laboratory: [{ slug: 'bnp', name: 'BNP', result: 'Elevado', is_key: true, category: 'laboratory' }],
      imaging: [],
      ecg: [],
      other: [],
    },
  },
  patient_profile: { name: 'Maria Souza', age: 72, sex: 'F', occupation: 'Aposentada', context: 'HAS, IC prévia' },
})

const mockCaseRepo = { findAll: jest.fn(), findById: jest.fn(), create: jest.fn() }
const mockSpecialtyRepo = { findAll: jest.fn(), findById: jest.fn() }
const mockSubscriptionRepo = { findByUserId: jest.fn(), create: jest.fn(), update: jest.fn() }
const mockQueueRepo = { create: jest.fn(), findByCaseId: jest.fn() }
const mockRevalidaCaseGeneratorService = { generate: jest.fn() }

describe('GenerateRevalidaCase', () => {
  let useCase: GenerateRevalidaCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new GenerateRevalidaCase(
      mockCaseRepo as never,
      mockSpecialtyRepo as never,
      mockSubscriptionRepo as never,
      mockQueueRepo as never,
      mockRevalidaCaseGeneratorService as never,
    )
  })

  const baseInput = {
    userId: 'user-1',
    role: 'student',
    specialtyId: 1,
    difficulty: 'intermediate' as const,
    language: 'pt' as const,
    countryContext: 'BR' as const,
    attentionLevel: 'primaria' as const,
  }

  it('throws PLAN_REQUIRED when user has free plan and is not admin', async () => {
    mockSubscriptionRepo.findByUserId.mockResolvedValue(makeSubscription('free'))

    await expect(useCase.execute(baseInput)).rejects.toMatchObject({
      code: 'PLAN_REQUIRED',
      statusCode: 403,
    })
  })

  it('throws PLAN_REQUIRED when subscription is null', async () => {
    mockSubscriptionRepo.findByUserId.mockResolvedValue(null)

    await expect(useCase.execute(baseInput)).rejects.toMatchObject({
      code: 'PLAN_REQUIRED',
      statusCode: 403,
    })
  })

  it('bypasses plan check for admin role', async () => {
    const sub = makeSubscription('free', 0, 100)
    mockSubscriptionRepo.findByUserId.mockResolvedValue(sub)
    mockSpecialtyRepo.findById.mockResolvedValue(makeSpecialty())
    mockRevalidaCaseGeneratorService.generate.mockResolvedValue(makeGeneratedData())
    const savedCase = ClinicalCase.create({
      id: 'case-admin-id',
      specialtyId: 1,
      createdById: 'admin-1',
      title: 'Paciente com dispneia aguda',
      difficulty: 'intermediate',
      language: 'pt',
      countryContext: 'BR',
      status: 'pending_review',
      caseBrief: {},
      availableExams: {},
      generationPrompt: null,
    })
    mockCaseRepo.create.mockResolvedValue(savedCase)
    mockQueueRepo.create.mockResolvedValue(undefined)
    mockSubscriptionRepo.update.mockResolvedValue(undefined)

    const result = await useCase.execute({ ...baseInput, userId: 'admin-1', role: 'admin' })

    expect(result.case).toBeDefined()
  })

  it('throws GENERATION_LIMIT_REACHED when limit exhausted', async () => {
    mockSubscriptionRepo.findByUserId.mockResolvedValue(makeSubscription('pro', 10, 10))

    await expect(useCase.execute(baseInput)).rejects.toMatchObject({
      code: 'GENERATION_LIMIT_REACHED',
      statusCode: 429,
    })
  })

  it('throws INVALID_SPECIALTY when specialty not found', async () => {
    mockSubscriptionRepo.findByUserId.mockResolvedValue(makeSubscription('pro'))
    mockSpecialtyRepo.findById.mockResolvedValue(null)

    await expect(useCase.execute(baseInput)).rejects.toMatchObject({
      code: 'INVALID_SPECIALTY',
      statusCode: 400,
    })
  })

  it('returns generated case on success with correct fields', async () => {
    mockSubscriptionRepo.findByUserId.mockResolvedValue(makeSubscription('pro'))
    mockSpecialtyRepo.findById.mockResolvedValue(makeSpecialty())
    mockRevalidaCaseGeneratorService.generate.mockResolvedValue(makeGeneratedData())
    const savedCase = ClinicalCase.create({
      id: 'revalida-case-id',
      specialtyId: 1,
      createdById: 'user-1',
      title: 'Paciente com dispneia aguda',
      difficulty: 'intermediate',
      language: 'pt',
      countryContext: 'BR',
      status: 'pending_review',
      caseBrief: {},
      availableExams: {},
      generationPrompt: null,
    })
    mockCaseRepo.create.mockResolvedValue(savedCase)
    mockQueueRepo.create.mockResolvedValue(undefined)
    mockSubscriptionRepo.update.mockResolvedValue(undefined)

    const result = await useCase.execute(baseInput)

    expect(result.case.id).toBe('revalida-case-id')
    expect(result.case.status).toBe('pending_review')
    expect(result.case.opening_message).toBe('Doutor, estou com falta de ar há algumas horas.')
    expect(result.case.message).toBe('Estação Revalida gerada e submetida para revisão.')
    expect(mockSubscriptionRepo.update).toHaveBeenCalledTimes(1)
    expect(mockQueueRepo.create).toHaveBeenCalledTimes(1)
  })

  it('rolls back generationsUsed on REVALIDA_GENERATION_FAILED', async () => {
    const sub = makeSubscription('pro', 5, 10)
    mockSubscriptionRepo.findByUserId.mockResolvedValue(sub)
    mockSpecialtyRepo.findById.mockResolvedValue(makeSpecialty())
    mockRevalidaCaseGeneratorService.generate.mockRejectedValue(new Error('OpenAI failed'))
    mockSubscriptionRepo.update.mockResolvedValue(undefined)

    await expect(useCase.execute(baseInput)).rejects.toMatchObject({
      code: 'REVALIDA_GENERATION_FAILED',
      statusCode: 500,
    })

    expect(mockSubscriptionRepo.update).toHaveBeenCalledTimes(2)
    expect(sub.generationsUsed).toBe(5)
  })
})
