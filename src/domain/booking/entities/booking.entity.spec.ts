import { Booking, CreateBookingProps } from './booking.entity';
import { Money } from '../../../common/domain/money.vo';
import { BookingStatusEnum } from '../value-objects/booking-status.vo';
import { TicketStatusEnum } from '../value-objects/ticket-status.vo';
import { TicketReservedEvent } from '../events/ticket-reserved.event';
import { BookingPaidEvent } from '../events/booking-paid.event';
import { BookingExpiredEvent } from '../events/booking-expired.event';

const baseProps = (): CreateBookingProps => ({
  customerId: 'customer-1',
  eventId: 'event-1',
  ticketCategoryId: 'category-1',
  quantity: 2,
  unitPrice: new Money(50_000),
});

const afterDeadline = (booking: Booking): Date =>
  new Date(booking.paymentDeadline.getTime() + 60_000);

describe('Booking aggregate', () => {
  describe('create()', () => {
    it('creates a PendingPayment booking with a payment deadline', () => {
      const booking = Booking.create(baseProps());

      expect(booking.bookingId.value).toBeDefined();
      expect(booking.status.value).toBe(BookingStatusEnum.PENDING_PAYMENT);
      expect(booking.paymentDeadline.getTime()).toBeGreaterThan(
        booking.createdAt.getTime(),
      );
      expect(booking.paidAt).toBeNull();
    });

    it('uses a 15-minute payment window by default', () => {
      const booking = Booking.create(baseProps());
      const windowMs =
        booking.paymentDeadline.getTime() - booking.createdAt.getTime();
      expect(Math.round(windowMs / 60_000)).toBe(15);
    });

    it('computes total price as unit price * quantity (US9)', () => {
      const booking = Booking.create(baseProps());
      expect(booking.totalPrice.amount).toBe(100_000);
    });

    it('adds the service fee to the total price (US9)', () => {
      const booking = Booking.create({
        ...baseProps(),
        serviceFee: new Money(5_000),
      });
      expect(booking.totalPrice.amount).toBe(105_000);
    });

    it('raises a TicketReserved domain event', () => {
      const booking = Booking.create(baseProps());

      expect(booking.domainEvents).toHaveLength(1);
      const event = booking.domainEvents[0] as TicketReservedEvent;
      expect(event).toBeInstanceOf(TicketReservedEvent);
      expect(event.quantity).toBe(2);
      expect(event.customerId).toBe('customer-1');
    });

    it('throws when quantity is zero', () => {
      expect(() => Booking.create({ ...baseProps(), quantity: 0 })).toThrow(
        'Ticket quantity must be greater than zero',
      );
    });

    it('throws when quantity is negative', () => {
      expect(() => Booking.create({ ...baseProps(), quantity: -1 })).toThrow(
        'Ticket quantity must be greater than zero',
      );
    });
  });

  describe('pay()', () => {
    it('marks the booking Paid and issues one active ticket per seat', () => {
      const booking = Booking.create(baseProps());
      booking.clearDomainEvents();

      const tickets = booking.pay(new Money(100_000));

      expect(booking.status.value).toBe(BookingStatusEnum.PAID);
      expect(booking.paidAt).toBeInstanceOf(Date);
      expect(tickets).toHaveLength(2);
      tickets.forEach((ticket) => {
        expect(ticket.status.value).toBe(TicketStatusEnum.ACTIVE);
        expect(ticket.bookingId).toBe(booking.bookingId.value);
        expect(ticket.eventId).toBe('event-1');
      });
      const codes = tickets.map((t) => t.ticketCode.value);
      expect(new Set(codes).size).toBe(2);
    });

    it('raises a BookingPaid domain event', () => {
      const booking = Booking.create(baseProps());
      booking.clearDomainEvents();

      booking.pay(new Money(100_000));

      const event = booking.domainEvents[0] as BookingPaidEvent;
      expect(event).toBeInstanceOf(BookingPaidEvent);
      expect(event.amount).toBe(100_000);
      expect(event.currency).toBe('IDR');
    });

    it('throws when the payment deadline has passed (US10)', () => {
      const booking = Booking.create(baseProps());

      expect(() =>
        booking.pay(new Money(100_000), afterDeadline(booking)),
      ).toThrow('Payment deadline has passed');
      expect(booking.status.value).toBe(BookingStatusEnum.PENDING_PAYMENT);
    });

    it('throws when the payment amount is incorrect (US10)', () => {
      const booking = Booking.create(baseProps());

      expect(() => booking.pay(new Money(99_999))).toThrow(
        'Payment amount must equal the total booking price',
      );
      expect(booking.status.value).toBe(BookingStatusEnum.PENDING_PAYMENT);
    });

    it('throws when the booking is not pending payment', () => {
      const booking = Booking.create(baseProps());
      booking.pay(new Money(100_000));

      expect(() => booking.pay(new Money(100_000))).toThrow(
        'Only a booking pending payment can be paid',
      );
    });
  });

  describe('expire()', () => {
    it('marks an overdue pending booking as Expired and raises BookingExpired', () => {
      const booking = Booking.create(baseProps());
      booking.clearDomainEvents();

      booking.expire(afterDeadline(booking));

      expect(booking.status.value).toBe(BookingStatusEnum.EXPIRED);
      const event = booking.domainEvents[0] as BookingExpiredEvent;
      expect(event).toBeInstanceOf(BookingExpiredEvent);
      expect(event.quantity).toBe(2);
    });

    it('does not allow a paid booking to expire (US11)', () => {
      const booking = Booking.create(baseProps());
      booking.pay(new Money(100_000));

      expect(() => booking.expire(afterDeadline(booking))).toThrow(
        'A paid booking cannot be expired',
      );
      expect(booking.status.value).toBe(BookingStatusEnum.PAID);
    });

    it('does not allow expiry before the payment deadline', () => {
      const booking = Booking.create(baseProps());

      expect(() => booking.expire(new Date())).toThrow(
        'Booking cannot expire before its payment deadline',
      );
    });
  });

  describe('markAsRefunded()', () => {
    it('refunds a paid booking', () => {
      const booking = Booking.create(baseProps());
      booking.pay(new Money(100_000));

      booking.markAsRefunded();

      expect(booking.status.value).toBe(BookingStatusEnum.REFUNDED);
    });

    it('throws when the booking is not paid', () => {
      const booking = Booking.create(baseProps());
      expect(() => booking.markAsRefunded()).toThrow(
        'Only a paid booking can be refunded',
      );
    });
  });
});
