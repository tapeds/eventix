import { BookingStatus, BookingStatusEnum } from './booking-status.vo';

describe('BookingStatus value object', () => {
  it('exposes predicate helpers per status', () => {
    expect(BookingStatus.pendingPayment().isPendingPayment()).toBe(true);
    expect(BookingStatus.paid().isPaid()).toBe(true);
    expect(BookingStatus.expired().isExpired()).toBe(true);
    expect(BookingStatus.refunded().isRefunded()).toBe(true);
    expect(BookingStatus.paid().isPendingPayment()).toBe(false);
  });

  it('throws on an invalid status', () => {
    expect(() => new BookingStatus('UNKNOWN' as BookingStatusEnum)).toThrow(
      'Invalid booking status: UNKNOWN',
    );
  });
});
