import { ValueObject } from '../../../common/domain/value-object';
import { v4 as uuidv4 } from 'uuid';

interface UserIdProps {
  value: string;
}

export class UserId extends ValueObject<UserIdProps> {
  constructor(value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('UserId cannot be empty');
    }
    super({ value });
  }

  get value(): string {
    return this.props.value;
  }

  static generate(): UserId {
    const id = uuidv4();
    return new UserId(id);
  }

  toString(): string {
    return this.props.value;
  }
}
