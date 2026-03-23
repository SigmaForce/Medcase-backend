import { Inject, Injectable } from '@nestjs/common'
import { DomainException } from '../../../../errors/domain-exception'
import { IUserRepository } from '../../domain/interfaces/user-repository.interface'
import { updateProfileSchema, UpdateProfileDto } from '../dtos/update-profile.dto'

export interface UpdateProfileInput {
  userId: string
  body: unknown
}

export interface UpdateProfileOutput {
  fullName: string
  country: string
  university: string
}

@Injectable()
export class UpdateProfile {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepo: IUserRepository,
  ) {}

  async execute({ userId, body }: UpdateProfileInput): Promise<UpdateProfileOutput> {
    const dto = updateProfileSchema.parse(body) as UpdateProfileDto

    const user = await this.userRepo.findById(userId)
    if (!user) throw new DomainException('USER_NOT_FOUND', 404)

    if (dto.full_name !== undefined) user.fullName = dto.full_name
    if (dto.country !== undefined) user.country = dto.country
    if (dto.university !== undefined) user.university = dto.university

    await this.userRepo.update(user)

    return {
      fullName: user.fullName,
      country: user.country,
      university: user.university,
    }
  }
}
