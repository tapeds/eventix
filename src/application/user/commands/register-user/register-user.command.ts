import { UserRoleEnum } from '../../../../domain/user/value-objects/user-role.vo';

export class RegisterUserCommand {
  constructor(
    readonly name: string,
    readonly email: string,
    readonly password: string,
    readonly role: UserRoleEnum,
  ) {}
}
