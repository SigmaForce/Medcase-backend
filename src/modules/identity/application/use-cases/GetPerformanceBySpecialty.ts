import { Inject, Injectable } from '@nestjs/common'
import { IStudentPerformanceRepository } from '../../domain/interfaces/student-performance-repository.interface'
import { DomainException } from '../../../../errors/domain-exception'

type ColorBand = 'green' | 'yellow' | 'red'

const getColorBand = (avg: number): ColorBand => {
  if (avg >= 80) return 'green'
  if (avg >= 60) return 'yellow'
  return 'red'
}

export interface GetPerformanceBySpecialtyInput {
  userId: string
  specialtyId: number
}

@Injectable()
export class GetPerformanceBySpecialty {
  constructor(
    @Inject('IStudentPerformanceRepository')
    private readonly performanceRepo: IStudentPerformanceRepository,
  ) {}

  async execute({ userId, specialtyId }: GetPerformanceBySpecialtyInput) {
    const record = await this.performanceRepo.findByUserAndSpecialty(userId, specialtyId)
    if (!record) {
      throw new DomainException('PERFORMANCE_NOT_FOUND', 404)
    }

    return {
      specialtyId: record.specialtyId,
      totalSessions: record.totalSessions,
      avgScoreTotal: record.avgScoreTotal,
      colorBand: getColorBand(record.avgScoreTotal),
      dimensions: {
        history_taking: { avg: record.avgHistoryTaking, colorBand: getColorBand(record.avgHistoryTaking) },
        differential: { avg: record.avgDifferential, colorBand: getColorBand(record.avgDifferential) },
        diagnosis: { avg: record.avgDiagnosis, colorBand: getColorBand(record.avgDiagnosis) },
        exams: { avg: record.avgExams, colorBand: getColorBand(record.avgExams) },
        management: { avg: record.avgManagement, colorBand: getColorBand(record.avgManagement) },
      },
      lastSessionAt: record.lastSessionAt,
    }
  }
}
