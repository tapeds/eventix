import { ValueObject } from '../../../common/domain/value-object';

interface EmailProps {
  value: string;
}

export class Email extends ValueObject<EmailProps> {
  private static readonly EMAIL_REGEX =
    /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

  constructor(value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('Email cannot be empty');
    }

    const normalized = value.trim().toLowerCase();

    if (!Email.EMAIL_REGEX.test(normalized)) {
      throw new Error(`Invalid email format: ${value}`);
    }

    super({ value: normalized });
  }

  get value(): string {
    return this.props.value;
  }

  toString(): string {
    return this.props.value;
  }
}
