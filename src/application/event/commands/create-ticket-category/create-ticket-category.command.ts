export class CreateTicketCategoryCommand {
  constructor(
    readonly eventId: string,
    readonly name: string,
    readonly price: number,
    readonly quota: number,
    readonly salesStartDate: Date,
    readonly salesEndDate: Date,
    readonly currency?: string,
  ) {}
}
