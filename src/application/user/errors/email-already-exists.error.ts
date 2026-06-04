import { ApplicationError } from '../../../common/application/errors/application.error';

export class EmailAlreadyExistsError extends ApplicationError {
  constructor(email: string) {
    super('EMAIL_ALREADY_EXISTS', `Email already registered: ${email}`);
  }
}
