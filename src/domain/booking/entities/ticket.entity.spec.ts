import { Ticket } from './ticket.entity';
import { TicketStatusEnum } from '../value-objects/ticket-status.vo';
import { TicketCheckedInEvent } from '../events/ticket-checked-in.event';

const issueTicket = (eventId = 'event-1'): Ticket =>
  Ticket.issue('booking-1', eventId);

describe('Ticket aggregate', () => {
  describe('issue()', () => {
    it('issues an active ticket with a unique code', () => {
      const ticket = issueTicket();

      expect(ticket.ticketId.value).toBeDefined();
      expect(ticket.status.value).toBe(TicketStatusEnum.ACTIVE);
      expect(ticket.ticketCode.value).toMatch(/^TKT-/);
      expect(ticket.checkedInAt).toBeNull();
    });
  });

  describe('checkIn()', () => {
    it('checks in an active ticket and raises TicketCheckedIn (US13)', () => {
      const ticket = issueTicket();
      const at = new Date('2026-06-01T09:00:00Z');

      ticket.checkIn('event-1', at);

      expect(ticket.status.value).toBe(TicketStatusEnum.CHECKED_IN);
      expect(ticket.checkedInAt).toEqual(at);
      const event = ticket.domainEvents[0] as TicketCheckedInEvent;
      expect(event).toBeInstanceOf(TicketCheckedInEvent);
      expect(event.ticketCode).toBe(ticket.ticketCode.value);
    });

    it('rejects a ticket that has already been checked in (US14)', () => {
      const ticket = issueTicket();
      ticket.checkIn('event-1');

      expect(() => ticket.checkIn('event-1')).toThrow(
        'Ticket has already been used',
      );
      expect(ticket.status.value).toBe(TicketStatusEnum.CHECKED_IN);
    });

    it('rejects a ticket that belongs to a different event (US14)', () => {
      const ticket = issueTicket('event-1');

      expect(() => ticket.checkIn('event-2')).toThrow(
        'Ticket does not match the event',
      );
      // status must not change on a failed check-in (US14)
      expect(ticket.status.value).toBe(TicketStatusEnum.ACTIVE);
      expect(ticket.domainEvents).toHaveLength(0);
    });

    it('rejects a cancelled ticket', () => {
      const ticket = issueTicket();
      ticket.cancel();

      expect(() => ticket.checkIn('event-1')).toThrow(
        'Only an active ticket can be checked in',
      );
      expect(ticket.status.value).toBe(TicketStatusEnum.CANCELLED);
    });
  });

  describe('cancel()', () => {
    it('cancels an active ticket', () => {
      const ticket = issueTicket();
      ticket.cancel();
      expect(ticket.status.value).toBe(TicketStatusEnum.CANCELLED);
    });

    it('cannot cancel a checked-in ticket', () => {
      const ticket = issueTicket();
      ticket.checkIn('event-1');
      expect(() => ticket.cancel()).toThrow(
        'A checked-in ticket cannot be cancelled',
      );
    });
  });

  describe('markRefundRequired()', () => {
    it('flags an active ticket as refund-required', () => {
      const ticket = issueTicket();
      ticket.markRefundRequired();
      expect(ticket.status.value).toBe(TicketStatusEnum.REFUND_REQUIRED);
    });

    it('cannot flag a cancelled ticket', () => {
      const ticket = issueTicket();
      ticket.cancel();
      expect(() => ticket.markRefundRequired()).toThrow(
        'A cancelled ticket cannot require a refund',
      );
    });
  });
});
