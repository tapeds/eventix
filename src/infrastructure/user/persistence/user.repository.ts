import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../domain/user/entities/user.entity';
import { IUserRepository } from '../../../domain/user/repositories/user.repository.interface';
import { Email } from '../../../domain/user/value-objects/email.vo';
import { UserId } from '../../../domain/user/value-objects/user-id.vo';
import { UserMapper } from '../mappers/user.mapper';
import { UserOrmEntity } from './user.orm-entity';

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(
    @InjectRepository(UserOrmEntity)
    private readonly repo: Repository<UserOrmEntity>,
  ) {}

  async save(user: User): Promise<void> {
    await this.repo.save(UserMapper.toOrm(user));
  }

  async findById(id: UserId): Promise<User | null> {
    const orm = await this.repo.findOne({ where: { id: id.value } });
    return orm ? UserMapper.toDomain(orm) : null;
  }

  async findByEmail(email: Email): Promise<User | null> {
    const orm = await this.repo.findOne({ where: { email: email.value } });
    return orm ? UserMapper.toDomain(orm) : null;
  }

  async existsByEmail(email: Email): Promise<boolean> {
    return this.repo.exists({ where: { email: email.value } });
  }

  async delete(id: UserId): Promise<void> {
    await this.repo.delete({ id: id.value });
  }
}
