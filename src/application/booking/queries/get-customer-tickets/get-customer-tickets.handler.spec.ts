/* eslint-disable @typescript-eslint/unbound-method -- jest.Mocked<T> mock references trigger a false positive */
import { GetCustomerTicketsHandler } from './get-customer-tickets.handler';
import { GetCustomerTicketsQuery } from './get-customer-tickets.query';
import { ITicketReadModel } from '../../read-models/ticket.read-model';
import { TicketDto } from '../../dtos/ticket.dto';
import { TicketStatusEnum } from '../../../../domain/booking/value-objects/ticket-status.vo';

const makeReadModel = (
  result: TicketDto[] | Error,
): jest.Mocked<ITicketReadModel> => ({
  findPaidCustomerTickets: jest
    .fn()
    .mockImplementation(() =>
      result instanceof Error
        ? Promise.reject(result)
        : Promise.resolve(result),
    ),
});

const sampleTicket = (overrides: Partial<TicketDto> = {}): TicketDto => ({
  ticketId: 'ticket-1',
  ticketCode: 'TKT-AAAAAAAAAAAA',
  bookingId: 'booking-1',
  eventId: 'event-1',
  status: TicketStatusEnum.ACTIVE,
  issuedAt: new Date('2026-05-01T00:00:00Z'),
  checkedInAt: null,
  ...overrides,
});

describe('GetCustomerTicketsHandler', () => {
  it("delegates to the read model with the query's customerId", async () => {
    const tickets = [sampleTicket(), sampleTicket({ ticketId: 'ticket-2' })];
    const readModel = makeReadModel(tickets);
    const handler = new GetCustomerTicketsHandler(readModel);

    const result = await handler.execute(
      new GetCustomerTicketsQuery('customer-1'),
    );

    expect(readModel.findPaidCustomerTickets).toHaveBeenCalledTimes(1);
    expect(readModel.findPaidCustomerTickets).toHaveBeenCalledWith(
      'customer-1',
    );
    expect(result).toBe(tickets);
  });

  it('returns an empty array unchanged', async () => {
    const readModel = makeReadModel([]);
    const handler = new GetCustomerTicketsHandler(readModel);

    const result = await handler.execute(
      new GetCustomerTicketsQuery('customer-1'),
    );

    expect(result).toEqual([]);
  });

  it('propagates errors from the read model', async () => {
    const readModel = makeReadModel(new Error('read model unavailable'));
    const handler = new GetCustomerTicketsHandler(readModel);

    await expect(
      handler.execute(new GetCustomerTicketsQuery('customer-1')),
    ).rejects.toThrow('read model unavailable');
  });
});
