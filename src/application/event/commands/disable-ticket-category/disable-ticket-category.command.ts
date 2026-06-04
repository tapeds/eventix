export class DisableTicketCategoryCommand {
  constructor(
    readonly eventId: string,
    readonly categoryId: string,
  ) {}
}
