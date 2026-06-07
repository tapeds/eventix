import { User } from '../../../domain/user/entities/user.entity';
import { UserRoleEnum } from '../../../domain/user/value-objects/user-role.vo';
import { UserOrmEntity } from '../persistence/user.orm-entity';

export class UserMapper {
  static toDomain(orm: UserOrmEntity): User {
    return User.reconstitute(orm.id, {
      name: orm.name,
      email: orm.email,
      role: orm.role as UserRoleEnum,
      passwordHash: orm.passwordHash,
      createdAt: orm.createdAt,
      updatedAt: orm.updatedAt,
    });
  }

  static toOrm(user: User): UserOrmEntity {
    const orm = new UserOrmEntity();
    orm.id = user.userId.value;
    orm.name = user.name.value;
    orm.email = user.email.value;
    orm.role = user.role.value;
    orm.passwordHash = user.passwordHash;
    orm.createdAt = user.createdAt;
    orm.updatedAt = user.updatedAt;
    return orm;
  }
}
