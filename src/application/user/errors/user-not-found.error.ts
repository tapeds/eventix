import { ApplicationError } from '../../../common/application/errors/application.error';

export class UserNotFoundError extends ApplicationError {
  constructor(identifier: string) {
    super('USER_NOT_FOUND', `User not found: ${identifier}`);
  }
}
