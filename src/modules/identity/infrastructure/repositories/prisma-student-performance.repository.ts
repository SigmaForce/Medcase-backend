import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../../infra/database/prisma.service'
import {
  IStudentPerformanceRepository,
  StudentPerformanceRecord,
} from '../../domain/interfaces/student-performance-repository.interface'

@Injectable()
export class PrismaStudentPerformanceRepository implements IStudentPerformanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByUser(userId: string): Promise<StudentPerformanceRecord[]> {
    const records = await this.prisma.studentPerformance.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    })
    return records.map((r) => this.toDomain(r))
  }

  async findByUserAndSpecialty(userId: string, specialtyId: number): Promise<StudentPerformanceRecord | null> {
    const record = await this.prisma.studentPerformance.findUnique({
      where: { unique_perf: { userId, specialtyId } },
    })
    return record ? this.toDomain(record) : null
  }

  private toDomain(record: {
    specialtyId: number
    totalSessions: number
    avgScoreTotal: unknown
    avgHistoryTaking: unknown
    avgDifferential: unknown
    avgDiagnosis: unknown
    avgExams: unknown
    avgManagement: unknown
    lastSessionAt: Date | null
  }): StudentPerformanceRecord {
    return {
      specialtyId: record.specialtyId,
      totalSessions: record.totalSessions,
      avgScoreTotal: Number(record.avgScoreTotal),
      avgHistoryTaking: Number(record.avgHistoryTaking),
      avgDifferential: Number(record.avgDifferential),
      avgDiagnosis: Number(record.avgDiagnosis),
      avgExams: Number(record.avgExams),
      avgManagement: Number(record.avgManagement),
      lastSessionAt: record.lastSessionAt,
    }
  }
}
