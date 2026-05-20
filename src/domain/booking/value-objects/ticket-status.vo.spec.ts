import { TicketStatus, TicketStatusEnum } from './ticket-status.vo';

describe('TicketStatus value object', () => {
  it('exposes predicate helpers per status', () => {
    expect(TicketStatus.active().isActive()).toBe(true);
    expect(TicketStatus.checkedIn().isCheckedIn()).toBe(true);
    expect(TicketStatus.cancelled().isCancelled()).toBe(true);
    expect(TicketStatus.refundRequired().isRefundRequired()).toBe(true);
    expect(TicketStatus.active().isCheckedIn()).toBe(false);
  });

  it('throws on an invalid status', () => {
    expect(() => new TicketStatus('UNKNOWN' as TicketStatusEnum)).toThrow(
      'Invalid ticket status: UNKNOWN',
    );
  });
});
