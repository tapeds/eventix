export interface PayoutRequest {
  refundId: string;
  bookingId: string;
  customerId: string;
  amount: number;
  currency: string;
  idempotencyKey: string;
}

export interface PayoutResult {
  paymentReference: string;
  paidOutAt: Date;
}

export interface IRefundPaymentService {
  payout(request: PayoutRequest): Promise<PayoutResult>;
}
