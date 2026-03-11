import { Specialty } from '../entities/specialty.entity'

export interface ISpecialtyRepository {
  findAll(): Promise<Specialty[]>
  findById(id: number): Promise<Specialty | null>
}
