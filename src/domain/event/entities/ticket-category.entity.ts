import { BaseEntity } from '../../../common/domain/base.entity';
import { Money } from '../../../common/domain/money.vo';
import {
  TicketCategoryStatus,
  TicketCategoryStatusEnum,
} from '../value-objects/ticket-category-status.vo';

export interface TicketCategoryProps {
  id: string;
  name: string;
  price: Money;
  quota: number;
  salesStartDate: Date;
  salesEndDate: Date;
  status?: TicketCategoryStatus;
}

export class TicketCategory extends BaseEntity<string> {
  private readonly _name: string;
  private readonly _price: Money;
  private _quota: number;
  private readonly _salesStartDate: Date;
  private readonly _salesEndDate: Date;
  private _status: TicketCategoryStatus;

  constructor(props: TicketCategoryProps) {
    super(props.id);
    if (props.price.amount < 0)
      throw new Error('Ticket price cannot be negative');
    if (!Number.isInteger(props.quota) || props.quota <= 0)
      throw new Error('Ticket quota must be greater than zero');
    if (props.salesEndDate.getTime() < props.salesStartDate.getTime())
      throw new Error('Ticket sales end must be after sales start');

    this._name = props.name;
    this._price = props.price;
    this._quota = props.quota;
    this._salesStartDate = props.salesStartDate;
    this._salesEndDate = props.salesEndDate;
    this._status =
      props.status ?? new TicketCategoryStatus(TicketCategoryStatusEnum.Active);
  }

  get name(): string {
    return this._name;
  }

  get price(): Money {
    return this._price;
  }

  get quota(): number {
    return this._quota;
  }

  get salesStartDate(): Date {
    return this._salesStartDate;
  }

  get salesEndDate(): Date {
    return this._salesEndDate;
  }

  get status(): TicketCategoryStatus {
    return this._status;
  }

  public disable(): void {
    this._status = new TicketCategoryStatus(TicketCategoryStatusEnum.Disabled);
  }

  public isActive(now: Date = new Date()): boolean {
    return (
      this._status.isActive() &&
      now >= this._salesStartDate &&
      now <= this._salesEndDate
    );
  }
}
