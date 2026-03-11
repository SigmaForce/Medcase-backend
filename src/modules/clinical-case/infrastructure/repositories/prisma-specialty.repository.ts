import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../../infra/database/prisma.service'
import { ISpecialtyRepository } from '../../domain/interfaces/specialty-repository.interface'
import { Specialty } from '../../domain/entities/specialty.entity'

type PrismaSpecialtyRecord = {
  id: number
  slug: string
  namePt: string
  nameEs: string
  icon: string | null
}

@Injectable()
export class PrismaSpecialtyRepository implements ISpecialtyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Specialty[]> {
    const records = await this.prisma.specialty.findMany({ orderBy: { namePt: 'asc' } })
    return records.map((r) => this.toDomain(r))
  }

  async findById(id: number): Promise<Specialty | null> {
    const record = await this.prisma.specialty.findUnique({ where: { id } })
    return record ? this.toDomain(record) : null
  }

  private toDomain(record: PrismaSpecialtyRecord): Specialty {
    return Specialty.create({
      id: record.id,
      slug: record.slug,
      namePt: record.namePt,
      nameEs: record.nameEs,
      icon: record.icon,
    })
  }
}
