import { AggregateRoot } from '../../../common/domain/aggregate-root';
import { BookingId } from '../value-objects/booking-id.vo';
import { BookingStatus } from '../value-objects/booking-status.vo';
import { Money } from '../../../common/domain/money.vo';
import { Ticket } from './ticket.entity';
import { TicketReservedEvent } from '../events/ticket-reserved.event';
import { BookingPaidEvent } from '../events/booking-paid.event';
import { BookingExpiredEvent } from '../events/booking-expired.event';

export interface BookingProps {
  customerId: string;
  eventId: string;
  ticketCategoryId: string;
  quantity: number;
  unitPrice: Money;
  serviceFee: Money;
  totalPrice: Money;
  status: BookingStatus;
  createdAt: Date;
  paymentDeadline: Date;
  paidAt: Date | null;
}

export interface CreateBookingProps {
  customerId: string;
  eventId: string;
  ticketCategoryId: string;
  quantity: number;
  unitPrice: Money;
  serviceFee?: Money;
  paymentWindowMinutes?: number;
}

const DEFAULT_PAYMENT_WINDOW_MINUTES = 15;

/**
 * Booking aggregate root: a customer's reservation for a number of tickets in one
 * ticket category, held until payment.
 *
 * NOTE: cross-aggregate rules (event must be Published, ticket category active and
 * within its sales period, quantity within remaining quota, only one active booking
 * per customer/event) depend on the Event aggregate and are enforced by the
 * application layer (Week 11). This aggregate enforces only its intrinsic rules.
 */
export class Booking extends AggregateRoot<BookingId> {
  private _customerId: string;
  private _eventId: string;
  private _ticketCategoryId: string;
  private _quantity: number;
  private _unitPrice: Money;
  private _serviceFee: Money;
  private _totalPrice: Money;
  private _status: BookingStatus;
  private _createdAt: Date;
  private _paymentDeadline: Date;
  private _paidAt: Date | null;
  private _issuedTickets: Ticket[] = [];

  private constructor(id: BookingId, props: BookingProps) {
    super(id);
    this._customerId = props.customerId;
    this._eventId = props.eventId;
    this._ticketCategoryId = props.ticketCategoryId;
    this._quantity = props.quantity;
    this._unitPrice = props.unitPrice;
    this._serviceFee = props.serviceFee;
    this._totalPrice = props.totalPrice;
    this._status = props.status;
    this._createdAt = props.createdAt;
    this._paymentDeadline = props.paymentDeadline;
    this._paidAt = props.paidAt;
  }

  get bookingId(): BookingId {
    return this._id;
  }

  get customerId(): string {
    return this._customerId;
  }

  get eventId(): string {
    return this._eventId;
  }

  get ticketCategoryId(): string {
    return this._ticketCategoryId;
  }

  get quantity(): number {
    return this._quantity;
  }

  get unitPrice(): Money {
    return this._unitPrice;
  }

  get serviceFee(): Money {
    return this._serviceFee;
  }

  get totalPrice(): Money {
    return this._totalPrice;
  }

  get status(): BookingStatus {
    return this._status;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get paymentDeadline(): Date {
    return this._paymentDeadline;
  }

  get paidAt(): Date | null {
    return this._paidAt;
  }

  get issuedTickets(): Ticket[] {
    return [...this._issuedTickets];
  }

  /**
   * US8 (Create Booking) + US9 (Calculate Total Price). Quantity must be positive;
   * the total price is unit price × quantity plus any service fee, represented as
   * Money (which forbids negative amounts). Status starts as PendingPayment with a
   * payment deadline (default 15 minutes).
   */
  static create(props: CreateBookingProps): Booking {
    if (!Number.isInteger(props.quantity) || props.quantity <= 0) {
      throw new Error('Ticket quantity must be greater than zero');
    }

    const serviceFee = props.serviceFee ?? Money.zero(props.unitPrice.currency);
    const totalPrice = props.unitPrice.multiply(props.quantity).add(serviceFee);

    const now = new Date();
    const windowMinutes =
      props.paymentWindowMinutes ?? DEFAULT_PAYMENT_WINDOW_MINUTES;
    const paymentDeadline = new Date(now.getTime() + windowMinutes * 60_000);

    const bookingId = BookingId.generate();
    const booking = new Booking(bookingId, {
      customerId: props.customerId,
      eventId: props.eventId,
      ticketCategoryId: props.ticketCategoryId,
      quantity: props.quantity,
      unitPrice: props.unitPrice,
      serviceFee,
      totalPrice,
      status: BookingStatus.pendingPayment(),
      createdAt: now,
      paymentDeadline,
      paidAt: null,
    });

    booking.addDomainEvent(
      new TicketReservedEvent(
        bookingId.value,
        props.customerId,
        props.eventId,
        props.ticketCategoryId,
        props.quantity,
      ),
    );

    return booking;
  }

  static reconstitute(id: string, props: BookingProps): Booking {
    return new Booking(new BookingId(id), props);
  }

  pay(amount: Money, now: Date = new Date()): Ticket[] {
    if (!this._status.isPendingPayment()) {
      throw new Error('Only a booking pending payment can be paid');
    }
    if (now.getTime() > this._paymentDeadline.getTime()) {
      throw new Error('Payment deadline has passed');
    }
    if (!amount.equals(this._totalPrice)) {
      throw new Error('Payment amount must equal the total booking price');
    }

    this._status = BookingStatus.paid();
    this._paidAt = now;

    this._issuedTickets = Array.from({ length: this._quantity }, () =>
      Ticket.issue(this._id.value, this._eventId),
    );

    this.addDomainEvent(
      new BookingPaidEvent(this._id.value, amount.amount, amount.currency, now),
    );

    return this.issuedTickets;
  }

  /**
   * US11 (Expire Booking). A PendingPayment booking past its deadline becomes
   * Expired, releasing reserved quota; a Paid booking can never expire.
   */
  expire(now: Date = new Date()): void {
    if (this._status.isPaid()) {
      throw new Error('A paid booking cannot be expired');
    }
    if (!this._status.isPendingPayment()) {
      throw new Error('Only a booking pending payment can expire');
    }
    if (now.getTime() <= this._paymentDeadline.getTime()) {
      throw new Error('Booking cannot expire before its payment deadline');
    }

    this._status = BookingStatus.expired();

    this.addDomainEvent(
      new BookingExpiredEvent(this._id.value, this._eventId, this._quantity),
    );
  }

  markAsRefunded(): void {
    if (!this._status.isPaid()) {
      throw new Error('Only a paid booking can be refunded');
    }
    this._status = BookingStatus.refunded();
  }
}
