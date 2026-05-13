import { User } from '../entities/user.entity';
import { UserId } from '../value-objects/user-id.vo';
import { Email } from '../value-objects/email.vo';

export interface IUserRepository {
  save(user: User): Promise<void>;

  findById(id: UserId): Promise<User | null>;

  findByEmail(email: Email): Promise<User | null>;

  existsByEmail(email: Email): Promise<boolean>;

  delete(id: UserId): Promise<void>;
}
