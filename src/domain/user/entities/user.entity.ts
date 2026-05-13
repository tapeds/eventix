import { AggregateRoot } from '../../../common/domain/aggregate-root';
import { UserId } from '../value-objects/user-id.vo';
import { UserRole, UserRoleEnum } from '../value-objects/user-role.vo';
import { Email } from '../value-objects/email.vo';
import { UserName } from '../value-objects/user-name.vo';
import { UserRegisteredEvent } from '../events/user-registered.event';
import { UserRoleChangedEvent } from '../events/user-role-changed.event';

export interface UserProps {
  name: UserName;
  email: Email;
  role: UserRole;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserProps {
  name: string;
  email: string;
  role: UserRoleEnum;
  passwordHash: string;
}

export class User extends AggregateRoot<UserId> {
  private _name: UserName;
  private _email: Email;
  private _role: UserRole;
  private _passwordHash: string;
  private _createdAt: Date;
  private _updatedAt: Date;

  private constructor(id: UserId, props: UserProps) {
    super(id);
    this._name = props.name;
    this._email = props.email;
    this._role = props.role;
    this._passwordHash = props.passwordHash;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  get userId(): UserId {
    return this._id;
  }

  get name(): UserName {
    return this._name;
  }

  get email(): Email {
    return this._email;
  }

  get role(): UserRole {
    return this._role;
  }

  get passwordHash(): string {
    return this._passwordHash;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  static register(props: CreateUserProps): User {
    const userId = UserId.generate();
    const now = new Date();

    const user = new User(userId, {
      name: new UserName(props.name),
      email: new Email(props.email),
      role: new UserRole(props.role),
      passwordHash: props.passwordHash,
      createdAt: now,
      updatedAt: now,
    });

    user.addDomainEvent(
      new UserRegisteredEvent(
        userId.value,
        props.email,
        props.name,
        props.role,
      ),
    );

    return user;
  }

  static reconstitute(
    id: string,
    props: Omit<UserProps, 'name' | 'email' | 'role'> & {
      name: string;
      email: string;
      role: UserRoleEnum;
    },
  ): User {
    return new User(new UserId(id), {
      name: new UserName(props.name),
      email: new Email(props.email),
      role: new UserRole(props.role),
      passwordHash: props.passwordHash,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    });
  }

  changeRole(newRole: UserRoleEnum): void {
    if (this._role.value === newRole) {
      return;
    }

    const previousRole = this._role.value;
    this._role = new UserRole(newRole);
    this._updatedAt = new Date();

    this.addDomainEvent(
      new UserRoleChangedEvent(this._id.value, previousRole, newRole),
    );
  }

  updatePasswordHash(newPasswordHash: string): void {
    if (!newPasswordHash || newPasswordHash.trim().length === 0) {
      throw new Error('Password hash cannot be empty');
    }
    this._passwordHash = newPasswordHash;
    this._updatedAt = new Date();
  }

  updateName(name: string): void {
    this._name = new UserName(name);
    this._updatedAt = new Date();
  }
}
