export interface StudentPerformanceRecord {
  specialtyId: number
  totalSessions: number
  avgScoreTotal: number
  avgHistoryTaking: number
  avgDifferential: number
  avgDiagnosis: number
  avgExams: number
  avgManagement: number
  lastSessionAt: Date | null
}

export interface IStudentPerformanceRepository {
  findAllByUser(userId: string): Promise<StudentPerformanceRecord[]>
  findByUserAndSpecialty(userId: string, specialtyId: number): Promise<StudentPerformanceRecord | null>
}
