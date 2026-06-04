export interface ChargeRequest {
  bookingId: string;
  customerId: string;
  amount: number;
  currency: string;
  idempotencyKey: string;
}

export interface ChargeResult {
  paymentReference: string;
  chargedAt: Date;
}

export interface IPaymentGateway {
  charge(request: ChargeRequest): Promise<ChargeResult>;
}
