import { Inject, Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { randomBytes, createHash } from 'crypto'
import * as bcrypt from 'bcrypt'
import { IUserRepository } from '../../domain/interfaces/user-repository.interface'
import { IRefreshTokenRepository } from '../../domain/interfaces/refresh-token-repository.interface'
import { IAuditLogRepository } from '../../domain/interfaces/audit-log-repository.interface'
import { RefreshToken } from '../../domain/entities/refresh-token.entity'
import { DomainException } from '../../../../errors/domain-exception'
import { loginSchema } from '../dtos/login.dto'
import { UserResponseDto } from '../dtos/user-response.dto'
import { env } from '../../../../config/env'

export interface LoginInput {
  email: string
  password: string
  ipAddress?: string
}

export interface LoginOutput {
  accessToken: string
  refreshToken: string
  user: UserResponseDto
}

@Injectable()
export class LoginUser {
  constructor(
    @Inject('IUserRepository') private readonly userRepo: IUserRepository,
    @Inject('IRefreshTokenRepository') private readonly refreshTokenRepo: IRefreshTokenRepository,
    @Inject('IAuditLogRepository') private readonly auditLogRepo: IAuditLogRepository,
    private readonly jwtService: JwtService,
  ) {}

  async execute(input: LoginInput): Promise<LoginOutput> {
    const data = loginSchema.parse(input)

    const user = await this.userRepo.findByEmail(data.email)
    if (!user) throw new DomainException('INVALID_CREDENTIALS', 401)

    const passwordMatch = await bcrypt.compare(data.password, user.passwordHash)
    if (!passwordMatch) throw new DomainException('INVALID_CREDENTIALS', 401)

    if (!user.isActive) throw new DomainException('EMAIL_NOT_CONFIRMED', 403)

    const accessToken = this.jwtService.sign(
      { sub: user.id, email: user.email, role: user.role },
      { secret: env.JWT_SECRET, expiresIn: 3600 },
    )

    const rawRefreshToken = randomBytes(32).toString('hex')
    const tokenHash = createHash('sha256').update(rawRefreshToken).digest('hex')
    const refreshTokenEntity = RefreshToken.create(user.id, tokenHash)
    await this.refreshTokenRepo.create(refreshTokenEntity)

    await this.auditLogRepo.log({
      userId: user.id,
      action: 'user.login',
      entity: 'user',
      entityId: user.id,
      ipAddress: input.ipAddress,
    })

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        country: user.country,
        university: user.university,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    }
  }
}
