export class RequestRefundCommand {
  constructor(
    readonly bookingId: string,
    readonly customerId: string,
  ) {}
}
