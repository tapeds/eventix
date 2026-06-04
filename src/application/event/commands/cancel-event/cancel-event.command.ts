export class CancelEventCommand {
  constructor(
    readonly eventId: string,
    readonly reason?: string,
  ) {}
}
