export class CreateBookingCommand {
  constructor(
    readonly customerId: string,
    readonly eventId: string,
    readonly ticketCategoryId: string,
    readonly quantity: number,
  ) {}
}

export interface CreateBookingResult {
  bookingId: string;
  paymentDeadline: Date;
  totalPrice: number;
  currency: string;
}
