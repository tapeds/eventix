import { RefundStatus, RefundStatusEnum } from './refund-status.vo';

describe('RefundStatus value object', () => {
  it('exposes predicate helpers per status', () => {
    expect(RefundStatus.requested().isRequested()).toBe(true);
    expect(RefundStatus.approved().isApproved()).toBe(true);
    expect(RefundStatus.rejected().isRejected()).toBe(true);
    expect(RefundStatus.paidOut().isPaidOut()).toBe(true);
    expect(RefundStatus.requested().isApproved()).toBe(false);
  });

  it('throws on an invalid status', () => {
    expect(() => new RefundStatus('UNKNOWN' as RefundStatusEnum)).toThrow(
      'Invalid refund status: UNKNOWN',
    );
  });
});
