import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../../infra/database/prisma.service'
import { IUserRepository } from '../../domain/interfaces/user-repository.interface'
import { User } from '../../domain/entities/user.entity'

type PrismaUser = {
  id: string
  email: string
  passwordHash: string
  fullName: string
  country: string
  university: string
  role: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const toDomain = (record: PrismaUser): User => {
  const user = new User()
  user.id = record.id
  user.email = record.email
  user.passwordHash = record.passwordHash
  user.fullName = record.fullName
  user.country = record.country
  user.university = record.university
  user.role = record.role as User['role']
  user.isActive = record.isActive
  user.createdAt = record.createdAt
  user.updatedAt = record.updatedAt
  return user
}

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({ where: { id } })
    return record ? toDomain(record) : null
  }

  async findByEmail(email: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({ where: { email } })
    return record ? toDomain(record) : null
  }

  async create(user: User): Promise<User> {
    const record = await this.prisma.user.create({
      data: {
        email: user.email,
        passwordHash: user.passwordHash,
        fullName: user.fullName,
        country: user.country,
        university: user.university,
        role: user.role,
        isActive: user.isActive,
      },
    })
    return toDomain(record)
  }

  async update(user: User): Promise<User> {
    const record = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        email: user.email,
        passwordHash: user.passwordHash,
        fullName: user.fullName,
        country: user.country,
        university: user.university,
        role: user.role,
        isActive: user.isActive,
      },
    })
    return toDomain(record)
  }
}
