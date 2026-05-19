export enum TicketCategoryStatusEnum {
  Active = 'Active',
  Disabled = 'Disabled',
}

export class TicketCategoryStatus {
  private readonly _value: TicketCategoryStatusEnum;

  constructor(value: TicketCategoryStatusEnum) {
    this._value = value;
  }

  get value(): TicketCategoryStatusEnum {
    return this._value;
  }

  public isActive(): boolean {
    return this._value === TicketCategoryStatusEnum.Active;
  }
}
