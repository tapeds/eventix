export class PayBookingCommand {
  constructor(
    readonly bookingId: string,
    readonly customerId: string,
    readonly amount: number,
    readonly currency: string,
  ) {}
}
