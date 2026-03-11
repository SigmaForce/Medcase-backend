import { Inject, Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { randomBytes, createHash } from 'crypto'
import dayjs from 'dayjs'
import { IRefreshTokenRepository } from '../../domain/interfaces/refresh-token-repository.interface'
import { IUserRepository } from '../../domain/interfaces/user-repository.interface'
import { RefreshToken } from '../../domain/entities/refresh-token.entity'
import { DomainException } from '../../../../errors/domain-exception'
import { env } from '../../../../config/env'

export interface RefreshTokensOutput {
  accessToken: string
  refreshToken: string
}

@Injectable()
export class RefreshTokens {
  constructor(
    @Inject('IRefreshTokenRepository') private readonly refreshTokenRepo: IRefreshTokenRepository,
    @Inject('IUserRepository') private readonly userRepo: IUserRepository,
    private readonly jwtService: JwtService,
  ) {}

  async execute(rawToken: string): Promise<RefreshTokensOutput> {
    const tokenHash = createHash('sha256').update(rawToken).digest('hex')
    const storedToken = await this.refreshTokenRepo.findByTokenHash(tokenHash)

    if (!storedToken) throw new DomainException('INVALID_REFRESH_TOKEN', 401)

    if (dayjs().isAfter(storedToken.expiresAt)) {
      await this.refreshTokenRepo.deleteByTokenHash(tokenHash)
      throw new DomainException('REFRESH_TOKEN_EXPIRED', 401)
    }

    const user = await this.userRepo.findById(storedToken.userId)
    if (!user) throw new DomainException('INVALID_REFRESH_TOKEN', 401)

    await this.refreshTokenRepo.deleteByTokenHash(tokenHash)

    const accessToken = this.jwtService.sign(
      { sub: user.id, email: user.email, role: user.role },
      { secret: env.JWT_SECRET, expiresIn: 3600 },
    )

    const newRawToken = randomBytes(32).toString('hex')
    const newTokenHash = createHash('sha256').update(newRawToken).digest('hex')
    const newRefreshToken = RefreshToken.create(user.id, newTokenHash)
    await this.refreshTokenRepo.create(newRefreshToken)

    return { accessToken, refreshToken: newRawToken }
  }
}
