import { UserRoleEnum } from '../../../../domain/user/value-objects/user-role.vo';

export class ChangeUserRoleCommand {
  constructor(
    readonly userId: string,
    readonly newRole: UserRoleEnum,
  ) {}
}
