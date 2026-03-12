import { Inject, Injectable } from '@nestjs/common'
import {
  IStudentPerformanceRepository,
  StudentPerformanceRecord,
} from '../../domain/interfaces/student-performance-repository.interface'

type ColorBand = 'green' | 'yellow' | 'red'

const getColorBand = (avg: number): ColorBand => {
  if (avg >= 80) return 'green'
  if (avg >= 60) return 'yellow'
  return 'red'
}

const getDimensions = (record: StudentPerformanceRecord) => ({
  history_taking: record.avgHistoryTaking,
  differential: record.avgDifferential,
  diagnosis: record.avgDiagnosis,
  exams: record.avgExams,
  management: record.avgManagement,
})

export interface GetPerformanceInput {
  userId: string
}

export interface GetPerformanceOutput {
  overall: {
    totalSessions: number
    avgScoreTotal: number
    weakestDimension: string
    strongestDimension: string
  }
  bySpecialty: Array<{
    specialtyId: number
    totalSessions: number
    avgScoreTotal: number
    avgHistoryTaking: number
    avgDifferential: number
    avgDiagnosis: number
    avgExams: number
    avgManagement: number
    lastSessionAt: Date | null
    colorBand: ColorBand
  }>
}

@Injectable()
export class GetPerformance {
  constructor(
    @Inject('IStudentPerformanceRepository')
    private readonly performanceRepo: IStudentPerformanceRepository,
  ) {}

  async execute({ userId }: GetPerformanceInput): Promise<GetPerformanceOutput> {
    const records = await this.performanceRepo.findAllByUser(userId)

    const bySpecialty = records.map((r) => ({
      specialtyId: r.specialtyId,
      totalSessions: r.totalSessions,
      avgScoreTotal: r.avgScoreTotal,
      avgHistoryTaking: r.avgHistoryTaking,
      avgDifferential: r.avgDifferential,
      avgDiagnosis: r.avgDiagnosis,
      avgExams: r.avgExams,
      avgManagement: r.avgManagement,
      lastSessionAt: r.lastSessionAt,
      colorBand: getColorBand(r.avgScoreTotal),
    }))

    const totalSessions = records.reduce((acc, r) => acc + r.totalSessions, 0)
    const avgScoreTotal =
      records.length > 0 ? records.reduce((acc, r) => acc + r.avgScoreTotal, 0) / records.length : 0

    const dimensionAvgs = records.length > 0
      ? {
          history_taking: records.reduce((acc, r) => acc + r.avgHistoryTaking, 0) / records.length,
          differential: records.reduce((acc, r) => acc + r.avgDifferential, 0) / records.length,
          diagnosis: records.reduce((acc, r) => acc + r.avgDiagnosis, 0) / records.length,
          exams: records.reduce((acc, r) => acc + r.avgExams, 0) / records.length,
          management: records.reduce((acc, r) => acc + r.avgManagement, 0) / records.length,
        }
      : { history_taking: 0, differential: 0, diagnosis: 0, exams: 0, management: 0 }

    const entries = Object.entries(dimensionAvgs) as [string, number][]
    const weakestDimension = entries.reduce((a, b) => (b[1] < a[1] ? b : a), entries[0])?.[0] ?? 'N/A'
    const strongestDimension = entries.reduce((a, b) => (b[1] > a[1] ? b : a), entries[0])?.[0] ?? 'N/A'

    return {
      overall: { totalSessions, avgScoreTotal, weakestDimension, strongestDimension },
      bySpecialty,
    }
  }
}
