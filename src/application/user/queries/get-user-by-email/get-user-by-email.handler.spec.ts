import { GetUserByEmailHandler } from './get-user-by-email.handler';
import { GetUserByEmailQuery } from './get-user-by-email.query';
import { IUserRepository } from '../../../../domain/user/repositories/user.repository.interface';
import { User } from '../../../../domain/user/entities/user.entity';
import { UserRoleEnum } from '../../../../domain/user/value-objects/user-role.vo';
import { UserNotFoundError } from '../../errors/user-not-found.error';

const buildUser = (): User =>
  User.reconstitute('22222222-2222-2222-2222-222222222222', {
    name: 'Dave',
    email: 'dave@example.com',
    role: UserRoleEnum.CUSTOMER,
    passwordHash: 'hash',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  });

const makeRepo = (user: User | null): jest.Mocked<IUserRepository> => ({
  save: jest.fn(),
  findById: jest.fn(),
  findByEmail: jest.fn().mockResolvedValue(user),
  existsByEmail: jest.fn(),
  delete: jest.fn(),
});

describe('GetUserByEmailHandler', () => {
  it('maps the user to a profile DTO', async () => {
    const handler = new GetUserByEmailHandler(makeRepo(buildUser()));

    const profile = await handler.execute(
      new GetUserByEmailQuery('dave@example.com'),
    );

    expect(profile.email).toBe('dave@example.com');
    expect(profile.name).toBe('Dave');
  });

  it('throws UserNotFoundError when no user matches the email', async () => {
    const handler = new GetUserByEmailHandler(makeRepo(null));

    await expect(
      handler.execute(new GetUserByEmailQuery('nobody@example.com')),
    ).rejects.toBeInstanceOf(UserNotFoundError);
  });
});
