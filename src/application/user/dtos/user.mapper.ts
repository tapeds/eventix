import { User } from '../../../domain/user/entities/user.entity';
import { UserProfileDto } from './user.dto';

export function toUserProfileDto(user: User): UserProfileDto {
  return {
    id: user.userId.value,
    name: user.name.value,
    email: user.email.value,
    role: user.role.value,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
