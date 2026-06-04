/* eslint-disable @typescript-eslint/unbound-method -- jest.Mocked<T> mock references trigger a false positive */
import { ChangeUserRoleHandler } from './change-user-role.handler';
import { ChangeUserRoleCommand } from './change-user-role.command';
import { IUserRepository } from '../../../../domain/user/repositories/user.repository.interface';
import { IDomainEventPublisher } from '../../../../common/application/domain-event-publisher.interface';
import { User } from '../../../../domain/user/entities/user.entity';
import { UserRoleEnum } from '../../../../domain/user/value-objects/user-role.vo';
import { UserNotFoundError } from '../../errors/user-not-found.error';

const USER_ID = '11111111-1111-1111-1111-111111111111';

const buildUser = (role: UserRoleEnum): User => {
  const user = User.reconstitute(USER_ID, {
    name: 'Bob',
    email: 'bob@example.com',
    role,
    passwordHash: 'hash',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  });
  user.clearDomainEvents();
  return user;
};

const makeRepo = (user: User | null): jest.Mocked<IUserRepository> => ({
  save: jest.fn().mockResolvedValue(undefined),
  findById: jest.fn().mockResolvedValue(user),
  findByEmail: jest.fn(),
  existsByEmail: jest.fn(),
  delete: jest.fn(),
});

const makePublisher = (): jest.Mocked<IDomainEventPublisher> => ({
  publish: jest.fn().mockResolvedValue(undefined),
  publishAll: jest.fn().mockResolvedValue(undefined),
});

describe('ChangeUserRoleHandler', () => {
  it('changes the role and publishes UserRoleChanged', async () => {
    const user = buildUser(UserRoleEnum.CUSTOMER);
    const repo = makeRepo(user);
    const publisher = makePublisher();
    const handler = new ChangeUserRoleHandler(repo, publisher);

    await handler.execute(
      new ChangeUserRoleCommand(USER_ID, UserRoleEnum.EVENT_ORGANIZER),
    );

    expect(user.role.value).toBe(UserRoleEnum.EVENT_ORGANIZER);
    const events = publisher.publishAll.mock.calls[0][0];
    expect(events.map((e) => e.eventName)).toContain('UserRoleChanged');
    expect(user.domainEvents).toHaveLength(0);
  });

  it('throws UserNotFoundError when the user does not exist', async () => {
    const handler = new ChangeUserRoleHandler(makeRepo(null), makePublisher());

    await expect(
      handler.execute(
        new ChangeUserRoleCommand(USER_ID, UserRoleEnum.GATE_OFFICER),
      ),
    ).rejects.toBeInstanceOf(UserNotFoundError);
  });

  it('is a no-op publishing no event when the role is unchanged', async () => {
    const user = buildUser(UserRoleEnum.CUSTOMER);
    const repo = makeRepo(user);
    const publisher = makePublisher();
    const handler = new ChangeUserRoleHandler(repo, publisher);

    await handler.execute(
      new ChangeUserRoleCommand(USER_ID, UserRoleEnum.CUSTOMER),
    );

    expect(publisher.publishAll).toHaveBeenCalledWith([]);
  });
});
