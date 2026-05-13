import { User } from './user.entity';
import { UserRoleEnum } from '../value-objects/user-role.vo';
import { UserRegisteredEvent } from '../events/user-registered.event';
import { UserRoleChangedEvent } from '../events/user-role-changed.event';

const BASE_PROPS = {
  name: 'John Doe',
  email: 'john.doe@example.com',
  role: UserRoleEnum.CUSTOMER,
  passwordHash: 'hashed_password_abc',
};

describe('User Aggregate', () => {
  describe('register()', () => {
    it('should create a user with valid properties', () => {
      const user = User.register(BASE_PROPS);

      expect(user.userId.value).toBeDefined();
      expect(user.name.value).toBe('John Doe');
      expect(user.email.value).toBe('john.doe@example.com');
      expect(user.role.value).toBe(UserRoleEnum.CUSTOMER);
      expect(user.passwordHash).toBe('hashed_password_abc');
      expect(user.createdAt).toBeInstanceOf(Date);
    });

    it('should raise a UserRegistered domain event', () => {
      const user = User.register(BASE_PROPS);

      expect(user.domainEvents).toHaveLength(1);
      expect(user.domainEvents[0]).toBeInstanceOf(UserRegisteredEvent);

      const event = user.domainEvents[0] as UserRegisteredEvent;
      expect(event.email).toBe('john.doe@example.com');
      expect(event.role).toBe(UserRoleEnum.CUSTOMER);
    });

    it('should generate a unique id for each new user', () => {
      const user1 = User.register(BASE_PROPS);
      const user2 = User.register(BASE_PROPS);

      expect(user1.userId.value).not.toBe(user2.userId.value);
    });

    it('should throw when name is empty', () => {
      expect(() => User.register({ ...BASE_PROPS, name: '' })).toThrow(
        'UserName cannot be empty',
      );
    });

    it('should throw when name is too short', () => {
      expect(() => User.register({ ...BASE_PROPS, name: 'A' })).toThrow(
        'UserName must be at least 2 characters long',
      );
    });

    it('should throw when email is invalid', () => {
      expect(() =>
        User.register({ ...BASE_PROPS, email: 'not-an-email' }),
      ).toThrow('Invalid email format');
    });

    it('should throw when email is empty', () => {
      expect(() => User.register({ ...BASE_PROPS, email: '' })).toThrow(
        'Email cannot be empty',
      );
    });

    it('should normalize the email to lowercase', () => {
      const user = User.register({ ...BASE_PROPS, email: 'John.Doe@EXAMPLE.COM' });
      expect(user.email.value).toBe('john.doe@example.com');
    });
  });

  describe('changeRole()', () => {
    it('should change the role and raise UserRoleChanged event', () => {
      const user = User.register(BASE_PROPS);
      user.clearDomainEvents(); // clear registration event

      user.changeRole(UserRoleEnum.EVENT_ORGANIZER);

      expect(user.role.value).toBe(UserRoleEnum.EVENT_ORGANIZER);
      expect(user.domainEvents).toHaveLength(1);

      const event = user.domainEvents[0] as UserRoleChangedEvent;
      expect(event).toBeInstanceOf(UserRoleChangedEvent);
      expect(event.previousRole).toBe(UserRoleEnum.CUSTOMER);
      expect(event.newRole).toBe(UserRoleEnum.EVENT_ORGANIZER);
    });

    it('should not raise a domain event when role does not change', () => {
      const user = User.register(BASE_PROPS);
      user.clearDomainEvents();

      user.changeRole(UserRoleEnum.CUSTOMER); // same role

      expect(user.domainEvents).toHaveLength(0);
    });
  });

  describe('updatePasswordHash()', () => {
    it('should update the password hash', () => {
      const user = User.register(BASE_PROPS);
      user.updatePasswordHash('new_hashed_password');
      expect(user.passwordHash).toBe('new_hashed_password');
    });

    it('should throw when the new password hash is empty', () => {
      const user = User.register(BASE_PROPS);
      expect(() => user.updatePasswordHash('')).toThrow(
        'Password hash cannot be empty',
      );
    });
  });

  describe('updateName()', () => {
    it('should update the display name', () => {
      const user = User.register(BASE_PROPS);
      user.updateName('Jane Doe');
      expect(user.name.value).toBe('Jane Doe');
    });

    it('should throw when the new name is empty', () => {
      const user = User.register(BASE_PROPS);
      expect(() => user.updateName('')).toThrow('UserName cannot be empty');
    });
  });

  describe('reconstitute()', () => {
    it('should reconstitute a user without raising domain events', () => {
      const user = User.reconstitute('some-uuid', {
        name: 'Alice',
        email: 'alice@example.com',
        role: UserRoleEnum.GATE_OFFICER,
        passwordHash: 'hash',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      });

      expect(user.name.value).toBe('Alice');
      expect(user.role.isGateOfficer()).toBe(true);
      expect(user.domainEvents).toHaveLength(0);
    });
  });
});
