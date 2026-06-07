import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import {
  DOMAIN_EVENT_PUBLISHER,
  PASSWORD_HASHER,
  USER_REPOSITORY,
} from '../../infrastructure/database/tokens';
import { InMemoryDomainEventPublisher } from '../../infrastructure/events/in-memory-domain-event-publisher';
import { BcryptPasswordHasher } from '../../infrastructure/user/services/bcrypt-password-hasher';
import { IDomainEventPublisher } from '../../common/application/domain-event-publisher.interface';
import { IUserRepository } from '../../domain/user/repositories/user.repository.interface';
import { IPasswordHasher } from '../../application/user/services/password-hasher.interface';
import { RegisterUserHandler } from '../../application/user/commands/register-user/register-user.handler';
import { ChangeUserRoleHandler } from '../../application/user/commands/change-user-role/change-user-role.handler';
import { GetUserProfileHandler } from '../../application/user/queries/get-user-profile/get-user-profile.handler';
import { GetUserByEmailHandler } from '../../application/user/queries/get-user-by-email/get-user-by-email.handler';
import { UserController } from './user.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [UserController],
  providers: [
    {
      provide: DOMAIN_EVENT_PUBLISHER,
      useClass: InMemoryDomainEventPublisher,
    },
    {
      provide: PASSWORD_HASHER,
      useClass: BcryptPasswordHasher,
    },
    {
      provide: RegisterUserHandler,
      useFactory: (
        repo: IUserRepository,
        hasher: IPasswordHasher,
        publisher: IDomainEventPublisher,
      ) => new RegisterUserHandler(repo, hasher, publisher),
      inject: [USER_REPOSITORY, PASSWORD_HASHER, DOMAIN_EVENT_PUBLISHER],
    },
    {
      provide: ChangeUserRoleHandler,
      useFactory: (repo: IUserRepository, publisher: IDomainEventPublisher) =>
        new ChangeUserRoleHandler(repo, publisher),
      inject: [USER_REPOSITORY, DOMAIN_EVENT_PUBLISHER],
    },
    {
      provide: GetUserProfileHandler,
      useFactory: (repo: IUserRepository) => new GetUserProfileHandler(repo),
      inject: [USER_REPOSITORY],
    },
    {
      provide: GetUserByEmailHandler,
      useFactory: (repo: IUserRepository) => new GetUserByEmailHandler(repo),
      inject: [USER_REPOSITORY],
    },
  ],
})
export class UserModule {}
