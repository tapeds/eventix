import { AggregateRoot } from '../../../common/domain/aggregate-root';
import { Money } from '../../../common/domain/money.vo';
import { RefundId } from '../value-objects/refund-id.vo';
import { RefundStatus } from '../value-objects/refund-status.vo';
import { RefundRequestedEvent } from '../events/refund-requested.event';
import { RefundApprovedEvent } from '../events/refund-approved.event';
import { RefundRejectedEvent } from '../events/refund-rejected.event';
import { RefundPaidOutEvent } from '../events/refund-paid-out.event';

export interface RefundProps {
  bookingId: string;
  customerId: string;
  amount: Money;
  status: RefundStatus;
  requestedAt: Date;
  decidedAt: Date | null;
  paidOutAt: Date | null;
  rejectionReason: string | null;
  paymentReference: string | null;
}

export interface RequestRefundProps {
  bookingId: string;
  customerId: string;
  amount: Money;
}

/**
 * Refund aggregate root: lifecycle of a single refund request for a paid booking.
 *
 * NOTE: cross-aggregate preconditions for requesting (booking must be Paid, no
 * ticket already checked in, before refund deadline, auto-allow when event is
 * cancelled) depend on the Booking/Ticket/Event aggregates and are enforced by
 * the application layer (Week 11). Side effects on approval ("tickets → Cancelled",
 * "booking → Refunded") are likewise orchestrated by the application layer
 * subscribing to RefundApprovedEvent — this aggregate only owns its own state.
 */
export class Refund extends AggregateRoot<RefundId> {
  private _bookingId: string;
  private _customerId: string;
  private _amount: Money;
  private _status: RefundStatus;
  private _requestedAt: Date;
  private _decidedAt: Date | null;
  private _paidOutAt: Date | null;
  private _rejectionReason: string | null;
  private _paymentReference: string | null;

  private constructor(id: RefundId, props: RefundProps) {
    super(id);
    this._bookingId = props.bookingId;
    this._customerId = props.customerId;
    this._amount = props.amount;
    this._status = props.status;
    this._requestedAt = props.requestedAt;
    this._decidedAt = props.decidedAt;
    this._paidOutAt = props.paidOutAt;
    this._rejectionReason = props.rejectionReason;
    this._paymentReference = props.paymentReference;
  }

  get refundId(): RefundId {
    return this._id;
  }

  get bookingId(): string {
    return this._bookingId;
  }

  get customerId(): string {
    return this._customerId;
  }

  get amount(): Money {
    return this._amount;
  }

  get status(): RefundStatus {
    return this._status;
  }

  get requestedAt(): Date {
    return this._requestedAt;
  }

  get decidedAt(): Date | null {
    return this._decidedAt;
  }

  get paidOutAt(): Date | null {
    return this._paidOutAt;
  }

  get rejectionReason(): string | null {
    return this._rejectionReason;
  }

  get paymentReference(): string | null {
    return this._paymentReference;
  }

  /** US15 — Customer requests a refund. */
  static request(props: RequestRefundProps): Refund {
    const refundId = RefundId.generate();
    const now = new Date();
    const refund = new Refund(refundId, {
      bookingId: props.bookingId,
      customerId: props.customerId,
      amount: props.amount,
      status: RefundStatus.requested(),
      requestedAt: now,
      decidedAt: null,
      paidOutAt: null,
      rejectionReason: null,
      paymentReference: null,
    });

    refund.addDomainEvent(
      new RefundRequestedEvent(
        refundId.value,
        props.bookingId,
        props.customerId,
        props.amount.amount,
        props.amount.currency,
      ),
    );

    return refund;
  }

  static reconstitute(id: string, props: RefundProps): Refund {
    return new Refund(new RefundId(id), props);
  }

  /** US16 — Event Organizer approves a requested refund. */
  approve(now: Date = new Date()): void {
    if (!this._status.isRequested()) {
      throw new Error('Only a requested refund can be approved');
    }

    this._status = RefundStatus.approved();
    this._decidedAt = now;

    this.addDomainEvent(
      new RefundApprovedEvent(this._id.value, this._bookingId, now),
    );
  }

  /** US17 — Event Organizer rejects a requested refund. */
  reject(reason: string, now: Date = new Date()): void {
    if (!this._status.isRequested()) {
      throw new Error('Only a requested refund can be rejected');
    }
    const trimmed = (reason ?? '').trim();
    if (trimmed.length === 0) {
      throw new Error('Rejection reason is required');
    }

    this._status = RefundStatus.rejected();
    this._decidedAt = now;
    this._rejectionReason = trimmed;

    this.addDomainEvent(
      new RefundRejectedEvent(this._id.value, this._bookingId, trimmed, now),
    );
  }

  /** US18 — System/Admin marks an approved refund as paid out. */
  markAsPaidOut(paymentReference: string, now: Date = new Date()): void {
    if (!this._status.isApproved()) {
      throw new Error('Only an approved refund can be marked as paid out');
    }
    const trimmed = (paymentReference ?? '').trim();
    if (trimmed.length === 0) {
      throw new Error('Payment reference is required');
    }

    this._status = RefundStatus.paidOut();
    this._paidOutAt = now;
    this._paymentReference = trimmed;

    this.addDomainEvent(
      new RefundPaidOutEvent(this._id.value, this._bookingId, trimmed, now),
    );
  }
}
