import { ValueObject } from '../../../common/domain/value-object';

export enum UserRoleEnum {
  CUSTOMER = 'CUSTOMER',
  EVENT_ORGANIZER = 'EVENT_ORGANIZER',
  GATE_OFFICER = 'GATE_OFFICER',
  SYSTEM_ADMIN = 'SYSTEM_ADMIN',
}

interface UserRoleProps {
  value: UserRoleEnum;
}

export class UserRole extends ValueObject<UserRoleProps> {
  constructor(value: UserRoleEnum) {
    if (!Object.values(UserRoleEnum).includes(value)) {
      throw new Error(`Invalid user role: ${value}`);
    }
    super({ value });
  }

  get value(): UserRoleEnum {
    return this.props.value;
  }

  isCustomer(): boolean {
    return this.props.value === UserRoleEnum.CUSTOMER;
  }

  isEventOrganizer(): boolean {
    return this.props.value === UserRoleEnum.EVENT_ORGANIZER;
  }

  isGateOfficer(): boolean {
    return this.props.value === UserRoleEnum.GATE_OFFICER;
  }

  isSystemAdmin(): boolean {
    return this.props.value === UserRoleEnum.SYSTEM_ADMIN;
  }

  static customer(): UserRole {
    return new UserRole(UserRoleEnum.CUSTOMER);
  }

  static eventOrganizer(): UserRole {
    return new UserRole(UserRoleEnum.EVENT_ORGANIZER);
  }

  static gateOfficer(): UserRole {
    return new UserRole(UserRoleEnum.GATE_OFFICER);
  }

  static systemAdmin(): UserRole {
    return new UserRole(UserRoleEnum.SYSTEM_ADMIN);
  }

  toString(): string {
    return this.props.value;
  }
}
