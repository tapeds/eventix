export class CheckInTicketCommand {
  constructor(
    readonly ticketCode: string,
    readonly eventId: string,
  ) {}
}

export interface CheckInTicketResult {
  ticketId: string;
  ticketCode: string;
  status: string;
  checkedInAt: Date;
}
