export class CreateEventCommand {
  constructor(
    readonly name: string,
    readonly startDate: Date,
    readonly endDate: Date,
    readonly maxCapacity: number,
    readonly description?: string,
    readonly location?: string,
  ) {}
}
