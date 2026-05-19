export enum EventStatusEnum {
  Draft = 'Draft',
  Published = 'Published',
  Cancelled = 'Cancelled',
  Completed = 'Completed',
}

export class EventStatus {
  private readonly _value: EventStatusEnum;

  constructor(value: EventStatusEnum) {
    this._value = value;
  }

  get value(): EventStatusEnum {
    return this._value;
  }

  public isPublished(): boolean {
    return this._value === EventStatusEnum.Published;
  }

  public isDraft(): boolean {
    return this._value === EventStatusEnum.Draft;
  }

  public isCancelled(): boolean {
    return this._value === EventStatusEnum.Cancelled;
  }
}
