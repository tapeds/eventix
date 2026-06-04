import { GetUserProfileHandler } from './get-user-profile.handler';
import { GetUserProfileQuery } from './get-user-profile.query';
import { IUserRepository } from '../../../../domain/user/repositories/user.repository.interface';
import { User } from '../../../../domain/user/entities/user.entity';
import { UserRoleEnum } from '../../../../domain/user/value-objects/user-role.vo';
import { UserNotFoundError } from '../../errors/user-not-found.error';

const USER_ID = '11111111-1111-1111-1111-111111111111';

const buildUser = (): User =>
  User.reconstitute(USER_ID, {
    name: 'Carol',
    email: 'carol@example.com',
    role: UserRoleEnum.EVENT_ORGANIZER,
    passwordHash: 'hash',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-02-01T00:00:00Z'),
  });

const makeRepo = (user: User | null): jest.Mocked<IUserRepository> => ({
  save: jest.fn(),
  findById: jest.fn().mockResolvedValue(user),
  findByEmail: jest.fn(),
  existsByEmail: jest.fn(),
  delete: jest.fn(),
});

describe('GetUserProfileHandler', () => {
  it('maps the user to a profile DTO', async () => {
    const handler = new GetUserProfileHandler(makeRepo(buildUser()));

    const profile = await handler.execute(new GetUserProfileQuery(USER_ID));

    expect(profile).toEqual({
      id: USER_ID,
      name: 'Carol',
      email: 'carol@example.com',
      role: UserRoleEnum.EVENT_ORGANIZER,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-02-01T00:00:00Z'),
    });
  });

  it('throws UserNotFoundError when the user does not exist', async () => {
    const handler = new GetUserProfileHandler(makeRepo(null));

    await expect(
      handler.execute(new GetUserProfileQuery(USER_ID)),
    ).rejects.toBeInstanceOf(UserNotFoundError);
  });
});
