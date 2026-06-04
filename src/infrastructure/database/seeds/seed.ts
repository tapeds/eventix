import { AppDataSource } from '../data-source';
import { BookingOrmEntity } from '../../booking/persistence/booking.orm-entity';
import { TicketOrmEntity } from '../../booking/persistence/ticket.orm-entity';

const EVENT_ID = '11111111-1111-1111-1111-111111111111';
const CATEGORY_ID = '22222222-2222-2222-2222-222222222222';
const CUSTOMER_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const CUSTOMER_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

const BOOKING_A1 = 'a1111111-1111-1111-1111-111111111111';
const BOOKING_A2 = 'a2222222-2222-2222-2222-222222222222';
const BOOKING_B1 = 'b1111111-1111-1111-1111-111111111111';

const TICKET_A1_1 = 'a1a1a1a1-1111-1111-1111-111111111111';
const TICKET_A1_2 = 'a1a1a1a1-2222-2222-2222-222222222222';
const TICKET_B1_1 = 'b1b1b1b1-1111-1111-1111-111111111111';

function buildBooking(overrides: Partial<BookingOrmEntity>): BookingOrmEntity {
  const b = new BookingOrmEntity();
  b.id = overrides.id!;
  b.customerId = overrides.customerId!;
  b.eventId = EVENT_ID;
  b.ticketCategoryId = CATEGORY_ID;
  b.quantity = overrides.quantity ?? 2;
  b.unitPriceAmount = overrides.unitPriceAmount ?? '50000.00';
  b.unitPriceCurrency = 'IDR';
  b.serviceFeeAmount = '0.00';
  b.serviceFeeCurrency = 'IDR';
  b.totalPriceAmount = overrides.totalPriceAmount ?? '100000.00';
  b.totalPriceCurrency = 'IDR';
  b.status = overrides.status!;
  b.createdAt = overrides.createdAt ?? new Date('2026-05-01T00:00:00Z');
  b.paymentDeadline =
    overrides.paymentDeadline ?? new Date('2026-05-01T00:15:00Z');
  b.paidAt = overrides.paidAt ?? null;
  return b;
}

function buildTicket(overrides: Partial<TicketOrmEntity>): TicketOrmEntity {
  const t = new TicketOrmEntity();
  t.id = overrides.id!;
  t.ticketCode = overrides.ticketCode!;
  t.bookingId = overrides.bookingId!;
  t.eventId = EVENT_ID;
  t.status = overrides.status ?? 'ACTIVE';
  t.issuedAt = overrides.issuedAt ?? new Date('2026-05-01T00:05:00Z');
  t.checkedInAt = overrides.checkedInAt ?? null;
  return t;
}

async function seed(): Promise<void> {
  await AppDataSource.initialize();

  try {
    await AppDataSource.transaction(async (mgr) => {
      await mgr.createQueryBuilder().delete().from(TicketOrmEntity).execute();
      await mgr.createQueryBuilder().delete().from(BookingOrmEntity).execute();

      await mgr.save(BookingOrmEntity, [
        buildBooking({
          id: BOOKING_A1,
          customerId: CUSTOMER_A,
          status: 'PAID',
          paidAt: new Date('2026-05-01T00:10:00Z'),
        }),
        buildBooking({
          id: BOOKING_A2,
          customerId: CUSTOMER_A,
          status: 'PENDING_PAYMENT',
          quantity: 1,
          unitPriceAmount: '50000.00',
          totalPriceAmount: '50000.00',
        }),
        buildBooking({
          id: BOOKING_B1,
          customerId: CUSTOMER_B,
          quantity: 1,
          unitPriceAmount: '100000.00',
          totalPriceAmount: '100000.00',
          status: 'PAID',
          paidAt: new Date('2026-05-02T00:10:00Z'),
        }),
      ]);

      await mgr.save(TicketOrmEntity, [
        buildTicket({
          id: TICKET_A1_1,
          ticketCode: 'TKT-AAA000000001',
          bookingId: BOOKING_A1,
        }),
        buildTicket({
          id: TICKET_A1_2,
          ticketCode: 'TKT-AAA000000002',
          bookingId: BOOKING_A1,
        }),
        buildTicket({
          id: TICKET_B1_1,
          ticketCode: 'TKT-BBB000000001',
          bookingId: BOOKING_B1,
          status: 'CHECKED_IN',
          checkedInAt: new Date('2026-05-03T10:00:00Z'),
        }),
      ]);
    });

    console.log('Seeded:');
    console.log(
      `  customer A (${CUSTOMER_A}) → 2 paid tickets, 1 pending booking`,
    );
    console.log(`  customer B (${CUSTOMER_B}) → 1 checked-in ticket`);
  } finally {
    await AppDataSource.destroy();
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
