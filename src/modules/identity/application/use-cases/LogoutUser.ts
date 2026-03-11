import { Inject, Injectable } from '@nestjs/common'
import { IRefreshTokenRepository } from '../../domain/interfaces/refresh-token-repository.interface'

@Injectable()
export class LogoutUser {
  constructor(
    @Inject('IRefreshTokenRepository') private readonly refreshTokenRepo: IRefreshTokenRepository,
  ) {}

  async execute(userId: string): Promise<void> {
    await this.refreshTokenRepo.deleteAllByUserId(userId)
  }
}
