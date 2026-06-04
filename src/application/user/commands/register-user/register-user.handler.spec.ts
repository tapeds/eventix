/* eslint-disable @typescript-eslint/unbound-method -- jest.Mocked<T> mock references trigger a false positive */
import { RegisterUserHandler } from './register-user.handler';
import { RegisterUserCommand } from './register-user.command';
import { IUserRepository } from '../../../../domain/user/repositories/user.repository.interface';
import { IPasswordHasher } from '../../services/password-hasher.interface';
import { IDomainEventPublisher } from '../../../../common/application/domain-event-publisher.interface';
import { UserRoleEnum } from '../../../../domain/user/value-objects/user-role.vo';
import { EmailAlreadyExistsError } from '../../errors/email-already-exists.error';

const makeRepo = (emailExists: boolean): jest.Mocked<IUserRepository> => ({
  save: jest.fn().mockResolvedValue(undefined),
  findById: jest.fn(),
  findByEmail: jest.fn(),
  existsByEmail: jest.fn().mockResolvedValue(emailExists),
  delete: jest.fn(),
});

const makeHasher = (): jest.Mocked<IPasswordHasher> => ({
  hash: jest.fn().mockResolvedValue('hashed-secret'),
  compare: jest.fn(),
});

const makePublisher = (): jest.Mocked<IDomainEventPublisher> => ({
  publish: jest.fn().mockResolvedValue(undefined),
  publishAll: jest.fn().mockResolvedValue(undefined),
});

const command = () =>
  new RegisterUserCommand(
    'Alice',
    'alice@example.com',
    'plaintext',
    UserRoleEnum.CUSTOMER,
  );

describe('RegisterUserHandler', () => {
  it('registers the user with a hashed password and publishes UserRegistered', async () => {
    const repo = makeRepo(false);
    const hasher = makeHasher();
    const publisher = makePublisher();
    const handler = new RegisterUserHandler(repo, hasher, publisher);

    const result = await handler.execute(command());

    expect(result.userId).toBeTruthy();
    expect(hasher.hash).toHaveBeenCalledWith('plaintext');

    const saved = repo.save.mock.calls[0][0];
    expect(saved.passwordHash).toBe('hashed-secret');

    const events = publisher.publishAll.mock.calls[0][0];
    expect(events.map((e) => e.eventName)).toContain('UserRegistered');
    expect(saved.domainEvents).toHaveLength(0);
  });

  it('throws EmailAlreadyExistsError and does not save when the email is taken', async () => {
    const repo = makeRepo(true);
    const hasher = makeHasher();
    const publisher = makePublisher();
    const handler = new RegisterUserHandler(repo, hasher, publisher);

    await expect(handler.execute(command())).rejects.toBeInstanceOf(
      EmailAlreadyExistsError,
    );
    expect(repo.save).not.toHaveBeenCalled();
    expect(publisher.publishAll).not.toHaveBeenCalled();
  });
});
