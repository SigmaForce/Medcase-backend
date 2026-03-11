import { UserRole } from '../../domain/entities/user.entity'
import { SubscriptionResponseDto } from '../../../subscription/application/dtos/subscription-response.dto'

export interface UserResponseDto {
  id: string
  email: string
  fullName: string
  country: string
  university: string
  role: UserRole
  isActive: boolean
  createdAt: Date
  subscription?: SubscriptionResponseDto
}
