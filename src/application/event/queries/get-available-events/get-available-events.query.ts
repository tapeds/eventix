export interface AvailableEventsFilter {
  date?: Date;
  location?: string;
}

export class GetAvailableEventsQuery {
  constructor(readonly filter: AvailableEventsFilter = {}) {}
}
