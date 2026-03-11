import { Inject, Injectable } from '@nestjs/common'
import { ISpecialtyRepository } from '../../domain/interfaces/specialty-repository.interface'
import { Specialty } from '../../domain/entities/specialty.entity'

export type ListSpecialtiesOutput = Specialty[]

@Injectable()
export class ListSpecialties {
  constructor(
    @Inject('ISpecialtyRepository')
    private readonly repo: ISpecialtyRepository,
  ) {}

  async execute(): Promise<ListSpecialtiesOutput> {
    return this.repo.findAll()
  }
}
