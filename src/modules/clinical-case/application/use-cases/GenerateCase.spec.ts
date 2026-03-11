jest.mock("src/config/env", () => ({
  env: { NODE_ENV: "test", OPENAI_API_KEY: "test-key" },
}));

import { GenerateCase } from "./GenerateCase";
import { DomainException } from "../../../../errors/domain-exception";
import { Specialty } from "../../domain/entities/specialty.entity";
import { Subscription } from "../../../subscription/domain/entities/subscription.entity";
import { ClinicalCase } from "../../domain/entities/clinical-case.entity";

const makeSubscription = (
  plan: Subscription["plan"] = "pro",
  generationsUsed = 0,
  generationsLimit = 10,
): Subscription => {
  const sub = new Subscription();
  sub.id = "sub-1";
  sub.userId = "user-1";
  sub.plan = plan;
  sub.status = "active";
  sub.casesLimit = 50;
  sub.casesUsed = 0;
  sub.generationsLimit = generationsLimit;
  sub.generationsUsed = generationsUsed;
  sub.usageResetAt = new Date(Date.now() + 86400000);
  sub.provider = null;
  sub.externalSubId = null;
  sub.createdAt = new Date();
  sub.updatedAt = new Date();
  return sub;
};

const makeSpecialty = () =>
  Specialty.create({
    id: 1,
    slug: "cardiologia",
    namePt: "Cardiologia",
    nameEs: "Cardiología",
  });

const makeGeneratedData = () => ({
  title: "Paciente com dor precordial",
  opening_message: "Doutor, estou com uma dor no peito há 2 horas.",
  case_brief: {
    diagnosis: "IAM com supra de ST",
    differential: ["Angina instável", "Dissecção de aorta"],
    expected_management: "AAS, heparina, cateterismo",
    key_findings: ["Supra de ST em DII"],
    teaching_points: ["Tempo é músculo"],
  },
  patient_profile: {
    name: "João Silva",
    age: 58,
    sex: "M",
    occupation: "Motorista",
    context: "HAS",
  },
  available_exams: {
    laboratory: [
      {
        slug: "troponina",
        name: "Troponina",
        result: "Elevada",
        is_key: true,
        category: "laboratory",
      },
    ],
    imaging: [
      {
        slug: "rx_torax",
        name: "Raio X tórax",
        result: "Normal",
        is_key: true,
        category: "imaging",
      },
    ],
    ecg: [],
    other: [],
  },
});

const mockCaseRepo = {
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
};
const mockSpecialtyRepo = { findAll: jest.fn(), findById: jest.fn() };
const mockSubscriptionRepo = {
  findByUserId: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
};
const mockCaseGeneratorService = { generate: jest.fn() };

describe("GenerateCase", () => {
  let useCase: GenerateCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new GenerateCase(
      mockCaseRepo as any,
      mockSpecialtyRepo as any,
      mockSubscriptionRepo as any,
      mockCaseGeneratorService as any,
    );
  });

  const baseInput = {
    userId: "user-1",
    role: "student",
    specialtyId: 1,
    difficulty: "intermediate" as const,
    language: "pt" as const,
    countryContext: "BR" as const,
  };

  it("throws PLAN_REQUIRED when user has free plan and is not admin", async () => {
    mockSubscriptionRepo.findByUserId.mockResolvedValue(
      makeSubscription("free"),
    );

    await expect(useCase.execute(baseInput)).rejects.toMatchObject({
      code: "PLAN_REQUIRED",
      statusCode: 403,
    });
  });

  it("throws PLAN_REQUIRED when subscription is null", async () => {
    mockSubscriptionRepo.findByUserId.mockResolvedValue(null);

    await expect(useCase.execute(baseInput)).rejects.toMatchObject({
      code: "PLAN_REQUIRED",
      statusCode: 403,
    });
  });

  it("throws GENERATION_LIMIT_REACHED when limit exhausted", async () => {
    mockSubscriptionRepo.findByUserId.mockResolvedValue(
      makeSubscription("pro", 10, 10),
    );

    await expect(useCase.execute(baseInput)).rejects.toMatchObject({
      code: "GENERATION_LIMIT_REACHED",
      statusCode: 429,
    });
  });

  it("throws INVALID_SPECIALTY when specialty not found", async () => {
    mockSubscriptionRepo.findByUserId.mockResolvedValue(
      makeSubscription("pro"),
    );
    mockSpecialtyRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute(baseInput)).rejects.toMatchObject({
      code: "INVALID_SPECIALTY",
      statusCode: 400,
    });
  });

  it("returns generated case on success", async () => {
    mockSubscriptionRepo.findByUserId.mockResolvedValue(
      makeSubscription("pro"),
    );
    mockSpecialtyRepo.findById.mockResolvedValue(makeSpecialty());
    mockCaseGeneratorService.generate.mockResolvedValue(makeGeneratedData());
    const savedCase = ClinicalCase.create({
      id: "new-case-id",
      specialtyId: 1,
      createdById: "user-1",
      title: "Paciente com dor precordial",
      difficulty: "intermediate",
      language: "pt",
      countryContext: "BR",
      status: "pending_review",
      caseBrief: {},
      availableExams: {},
    });
    mockCaseRepo.create.mockResolvedValue(savedCase);
    mockSubscriptionRepo.update.mockResolvedValue(undefined);

    const result = await useCase.execute(baseInput);

    expect(result.case.id).toBe("new-case-id");
    expect(result.case.status).toBe("pending_review");
    expect(result.case.openingMessage).toBe(
      "Doutor, estou com uma dor no peito há 2 horas.",
    );
    expect(mockSubscriptionRepo.update).toHaveBeenCalledTimes(1);
  });

  it("rolls back generationsUsed on GENERATION_FAILED", async () => {
    const sub = makeSubscription("pro", 5, 10);
    mockSubscriptionRepo.findByUserId.mockResolvedValue(sub);
    mockSpecialtyRepo.findById.mockResolvedValue(makeSpecialty());
    mockCaseGeneratorService.generate.mockRejectedValue(
      new Error("OpenAI failed"),
    );
    mockSubscriptionRepo.update.mockResolvedValue(undefined);

    await expect(useCase.execute(baseInput)).rejects.toMatchObject({
      code: "GENERATION_FAILED",
      statusCode: 500,
    });

    expect(mockSubscriptionRepo.update).toHaveBeenCalledTimes(2);
    expect(sub.generationsUsed).toBe(5);
  });

  it("bypasses plan check for admin role", async () => {
    // admin with free plan but has enough generations limit
    const sub = makeSubscription("free", 0, 100);
    mockSubscriptionRepo.findByUserId.mockResolvedValue(sub);
    mockSpecialtyRepo.findById.mockResolvedValue(makeSpecialty());
    mockCaseGeneratorService.generate.mockResolvedValue(makeGeneratedData());
    const savedCase = ClinicalCase.create({
      id: "new-case-id",
      specialtyId: 1,
      createdById: "admin-1",
      title: "Test",
      difficulty: "beginner",
      language: "pt",
      countryContext: "BR",
      status: "pending_review",
      caseBrief: {},
      availableExams: {},
    });
    mockCaseRepo.create.mockResolvedValue(savedCase);
    mockSubscriptionRepo.update.mockResolvedValue(undefined);

    const result = await useCase.execute({
      ...baseInput,
      userId: "admin-1",
      role: "admin",
    });

    expect(result.case).toBeDefined();
  });
});
