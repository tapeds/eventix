import { Refund, RequestRefundProps } from './refund.entity';
import { Money } from '../../../common/domain/money.vo';
import {
  RefundStatus,
  RefundStatusEnum,
} from '../value-objects/refund-status.vo';
import { RefundRequestedEvent } from '../events/refund-requested.event';
import { RefundApprovedEvent } from '../events/refund-approved.event';
import { RefundRejectedEvent } from '../events/refund-rejected.event';
import { RefundPaidOutEvent } from '../events/refund-paid-out.event';

const baseProps = (): RequestRefundProps => ({
  bookingId: 'booking-1',
  customerId: 'customer-1',
  amount: new Money(100_000),
});

describe('Refund aggregate', () => {
  describe('request()', () => {
    it('creates a Requested refund and raises RefundRequested (US15)', () => {
      const refund = Refund.request(baseProps());

      expect(refund.refundId.value).toBeDefined();
      expect(refund.status.value).toBe(RefundStatusEnum.REQUESTED);
      expect(refund.bookingId).toBe('booking-1');
      expect(refund.customerId).toBe('customer-1');
      expect(refund.amount.amount).toBe(100_000);
      expect(refund.decidedAt).toBeNull();
      expect(refund.paidOutAt).toBeNull();
      expect(refund.rejectionReason).toBeNull();
      expect(refund.paymentReference).toBeNull();

      const event = refund.domainEvents[0] as RefundRequestedEvent;
      expect(event).toBeInstanceOf(RefundRequestedEvent);
      expect(event.amount).toBe(100_000);
      expect(event.currency).toBe('IDR');
    });
  });

  describe('approve()', () => {
    it('flips status to Approved and raises RefundApproved (US16)', () => {
      const refund = Refund.request(baseProps());
      refund.clearDomainEvents();

      const at = new Date('2026-06-01T12:00:00Z');
      refund.approve(at);

      expect(refund.status.value).toBe(RefundStatusEnum.APPROVED);
      expect(refund.decidedAt).toEqual(at);
      const event = refund.domainEvents[0] as RefundApprovedEvent;
      expect(event).toBeInstanceOf(RefundApprovedEvent);
      expect(event.approvedAt).toEqual(at);
    });

    it('throws when the refund is not in Requested status (US16, §5)', () => {
      const refund = Refund.request(baseProps());
      refund.approve();

      expect(() => refund.approve()).toThrow(
        'Only a requested refund can be approved',
      );
      // status unchanged
      expect(refund.status.value).toBe(RefundStatusEnum.APPROVED);
    });
  });

  describe('reject()', () => {
    it('flips status to Rejected, stores the reason, raises RefundRejected (US17)', () => {
      const refund = Refund.request(baseProps());
      refund.clearDomainEvents();

      const at = new Date('2026-06-01T13:00:00Z');
      refund.reject('  duplicate request  ', at);

      expect(refund.status.value).toBe(RefundStatusEnum.REJECTED);
      expect(refund.decidedAt).toEqual(at);
      expect(refund.rejectionReason).toBe('duplicate request');
      const event = refund.domainEvents[0] as RefundRejectedEvent;
      expect(event).toBeInstanceOf(RefundRejectedEvent);
      expect(event.reason).toBe('duplicate request');
    });

    it('throws when the reason is empty (US17, §5)', () => {
      const refund = Refund.request(baseProps());

      expect(() => refund.reject('')).toThrow('Rejection reason is required');
      expect(() => refund.reject('   ')).toThrow(
        'Rejection reason is required',
      );
      // status unchanged on failed rejection
      expect(refund.status.value).toBe(RefundStatusEnum.REQUESTED);
    });

    it('throws when the refund is not Requested', () => {
      const refund = Refund.request(baseProps());
      refund.approve();

      expect(() => refund.reject('too late')).toThrow(
        'Only a requested refund can be rejected',
      );
      expect(refund.status.value).toBe(RefundStatusEnum.APPROVED);
    });
  });

  describe('markAsPaidOut()', () => {
    it('flips Approved → PaidOut, stores reference, raises RefundPaidOut (US18)', () => {
      const refund = Refund.request(baseProps());
      refund.approve();
      refund.clearDomainEvents();

      const at = new Date('2026-06-02T09:00:00Z');
      refund.markAsPaidOut('PAYREF-001', at);

      expect(refund.status.value).toBe(RefundStatusEnum.PAID_OUT);
      expect(refund.paidOutAt).toEqual(at);
      expect(refund.paymentReference).toBe('PAYREF-001');
      const event = refund.domainEvents[0] as RefundPaidOutEvent;
      expect(event).toBeInstanceOf(RefundPaidOutEvent);
      expect(event.paymentReference).toBe('PAYREF-001');
    });

    it('throws when the refund is not Approved', () => {
      const refund = Refund.request(baseProps());

      expect(() => refund.markAsPaidOut('PAYREF-001')).toThrow(
        'Only an approved refund can be marked as paid out',
      );
      expect(refund.status.value).toBe(RefundStatusEnum.REQUESTED);
    });

    it('throws when the payment reference is empty (US18)', () => {
      const refund = Refund.request(baseProps());
      refund.approve();

      expect(() => refund.markAsPaidOut('')).toThrow(
        'Payment reference is required',
      );
      expect(() => refund.markAsPaidOut('   ')).toThrow(
        'Payment reference is required',
      );
      expect(refund.status.value).toBe(RefundStatusEnum.APPROVED);
    });

    it('cannot be approved or rejected after being paid out (US18)', () => {
      const refund = Refund.request(baseProps());
      refund.approve();
      refund.markAsPaidOut('PAYREF-001');

      expect(() => refund.approve()).toThrow(
        'Only a requested refund can be approved',
      );
      expect(() => refund.reject('any')).toThrow(
        'Only a requested refund can be rejected',
      );
      expect(() => refund.markAsPaidOut('PAYREF-002')).toThrow(
        'Only an approved refund can be marked as paid out',
      );
      expect(refund.status.value).toBe(RefundStatusEnum.PAID_OUT);
    });
  });

  describe('reconstitute()', () => {
    it('rebuilds a refund without raising events', () => {
      const refund = Refund.reconstitute('refund-uuid', {
        bookingId: 'booking-1',
        customerId: 'customer-1',
        amount: new Money(100_000),
        status: RefundStatus.approved(),
        requestedAt: new Date('2026-05-01'),
        decidedAt: new Date('2026-05-02'),
        paidOutAt: null,
        rejectionReason: null,
        paymentReference: null,
      });

      expect(refund.refundId.value).toBe('refund-uuid');
      expect(refund.status.value).toBe(RefundStatusEnum.APPROVED);
      expect(refund.domainEvents).toHaveLength(0);
    });
  });
});
