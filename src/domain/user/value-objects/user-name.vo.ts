import { ValueObject } from '../../../common/domain/value-object';

interface UserNameProps {
  value: string;
}

export class UserName extends ValueObject<UserNameProps> {
  private static readonly MIN_LENGTH = 2;
  private static readonly MAX_LENGTH = 100;

  constructor(value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('UserName cannot be empty');
    }

    const trimmed = value.trim();

    if (trimmed.length < UserName.MIN_LENGTH) {
      throw new Error(
        `UserName must be at least ${UserName.MIN_LENGTH} characters long`,
      );
    }

    if (trimmed.length > UserName.MAX_LENGTH) {
      throw new Error(
        `UserName must be at most ${UserName.MAX_LENGTH} characters long`,
      );
    }

    super({ value: trimmed });
  }

  get value(): string {
    return this.props.value;
  }

  toString(): string {
    return this.props.value;
  }
}
