export class RejectRefundCommand {
  constructor(
    readonly refundId: string,
    readonly reason: string,
  ) {}
}
