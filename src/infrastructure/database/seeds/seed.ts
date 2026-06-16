import { AppDataSource } from '../data-source';
import { BookingOrmEntity } from '../../booking/persistence/booking.orm-entity';
import { TicketOrmEntity } from '../../booking/persistence/ticket.orm-entity';
import { EventOrmEntity } from '../../event/persistence/event.orm-entity';
import { TicketCategoryOrmEntity } from '../../event/persistence/ticket-category.orm-entity';

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

const LIVE_EVENT_ID = '33333333-3333-3333-3333-333333333333';
const LIVE_CATEGORY_ID = '44444444-4444-4444-4444-444444444444';
const LIVE_CUSTOMER = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const LIVE_BOOKING = 'c1111111-1111-1111-1111-111111111111';
const LIVE_TICKET = 'c1c1c1c1-1111-1111-1111-111111111111';
const LIVE_TICKET_CODE = 'TKT-LIVE00000001';

const HOUR = 60 * 60_000;
const DAY = 24 * HOUR;
const NOW = Date.now();

function buildEvent(): EventOrmEntity {
  const e = new EventOrmEntity();
  e.id = EVENT_ID;
  e.name = 'Eventix Demo Concert';
  e.description = 'Seeded Published event for manual API testing';
  e.startDate = new Date(NOW + 45 * DAY);
  e.endDate = new Date(NOW + 45 * DAY + 3 * HOUR);
  e.location = 'Jakarta';
  e.maxCapacity = 100;
  e.status = 'Published';
  return e;
}

function buildCategory(): TicketCategoryOrmEntity {
  const c = new TicketCategoryOrmEntity();
  c.id = CATEGORY_ID;
  c.eventId = EVENT_ID;
  c.name = 'Regular';
  c.priceAmount = '50000.00';
  c.priceCurrency = 'IDR';
  c.quota = 20;
  c.salesStartDate = new Date(NOW - 30 * DAY);
  c.salesEndDate = new Date(NOW + 40 * DAY);
  c.status = 'Active';
  return c;
}

function buildLiveEvent(): EventOrmEntity {
  const e = new EventOrmEntity();
  e.id = LIVE_EVENT_ID;
  e.name = 'Eventix Live Show (in progress)';
  e.description = 'Seeded event currently in its check-in window';
  e.startDate = new Date(NOW - 30 * 60_000);
  e.endDate = new Date(NOW + 2 * HOUR);
  e.location = 'Bandung';
  e.maxCapacity = 50;
  e.status = 'Published';
  return e;
}

function buildLiveCategory(): TicketCategoryOrmEntity {
  const c = new TicketCategoryOrmEntity();
  c.id = LIVE_CATEGORY_ID;
  c.eventId = LIVE_EVENT_ID;
  c.name = 'General Admission';
  c.priceAmount = '75000.00';
  c.priceCurrency = 'IDR';
  c.quota = 50;
  c.salesStartDate = new Date(NOW - 7 * DAY);
  c.salesEndDate = new Date(NOW - 60 * 60_000);
  c.status = 'Active';
  return c;
}

function buildBooking(
  overrides: Partial<BookingOrmEntity> & {
    id: string;
    customerId: string;
    status: string;
  },
): BookingOrmEntity {
  const b = new BookingOrmEntity();
  b.id = overrides.id;
  b.customerId = overrides.customerId;
  b.eventId = overrides.eventId ?? EVENT_ID;
  b.ticketCategoryId = overrides.ticketCategoryId ?? CATEGORY_ID;
  b.quantity = overrides.quantity ?? 2;
  b.unitPriceAmount = overrides.unitPriceAmount ?? '50000.00';
  b.unitPriceCurrency = overrides.unitPriceCurrency ?? 'IDR';
  b.serviceFeeAmount = overrides.serviceFeeAmount ?? '0.00';
  b.serviceFeeCurrency = overrides.serviceFeeCurrency ?? 'IDR';
  b.totalPriceAmount = overrides.totalPriceAmount ?? '100000.00';
  b.totalPriceCurrency = overrides.totalPriceCurrency ?? 'IDR';
  b.status = overrides.status;
  b.createdAt = overrides.createdAt ?? new Date('2026-05-01T00:00:00Z');
  b.paymentDeadline =
    overrides.paymentDeadline ?? new Date('2026-05-01T00:15:00Z');
  b.paidAt = overrides.paidAt ?? null;
  return b;
}

function buildTicket(
  overrides: Partial<TicketOrmEntity> & {
    id: string;
    ticketCode: string;
    bookingId: string;
  },
): TicketOrmEntity {
  const t = new TicketOrmEntity();
  t.id = overrides.id;
  t.ticketCode = overrides.ticketCode;
  t.bookingId = overrides.bookingId;
  t.eventId = overrides.eventId ?? EVENT_ID;
  t.status = overrides.status ?? 'ACTIVE';
  t.issuedAt = overrides.issuedAt ?? new Date('2026-05-01T00:05:00Z');
  t.checkedInAt = overrides.checkedInAt ?? null;
  return t;
}

async function seed(): Promise<void> {
  await AppDataSource.initialize();

  try {
    await AppDataSource.transaction(async (mgr) => {
      await mgr.query(
        'TRUNCATE TABLE refunds, tickets, bookings, ticket_categories, events CASCADE',
      );

      await mgr.save(EventOrmEntity, [buildEvent(), buildLiveEvent()]);
      await mgr.save(TicketCategoryOrmEntity, [
        buildCategory(),
        buildLiveCategory(),
      ]);

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
        buildBooking({
          id: LIVE_BOOKING,
          customerId: LIVE_CUSTOMER,
          eventId: LIVE_EVENT_ID,
          ticketCategoryId: LIVE_CATEGORY_ID,
          quantity: 1,
          unitPriceAmount: '75000.00',
          totalPriceAmount: '75000.00',
          status: 'PAID',
          createdAt: new Date(NOW - 2 * DAY),
          paymentDeadline: new Date(NOW - 2 * DAY + 15 * 60_000),
          paidAt: new Date(NOW - 2 * DAY + 5 * 60_000),
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
        buildTicket({
          id: LIVE_TICKET,
          ticketCode: LIVE_TICKET_CODE,
          bookingId: LIVE_BOOKING,
          eventId: LIVE_EVENT_ID,
          issuedAt: new Date(NOW - 2 * DAY + 6 * 60_000),
        }),
      ]);
    });

    console.log('Seeded:');
    console.log(`  upcoming event ${EVENT_ID}`);
    console.log('    Published, capacity 100, starts in 45 days');
    console.log(
      `    category ${CATEGORY_ID} (Regular @ 50_000 IDR, quota 20, sales open)`,
    );
    console.log(
      `    customer A (${CUSTOMER_A}) → 2 paid tickets + 1 pending booking`,
    );
    console.log(`    customer B (${CUSTOMER_B}) → 1 checked-in ticket`);
    console.log('');
    console.log(`  live event ${LIVE_EVENT_ID}`);
    console.log('    Published, capacity 50, started 30min ago, ends in 2h');
    console.log(`    category ${LIVE_CATEGORY_ID} (General Admission)`);
    console.log(
      `    customer ${LIVE_CUSTOMER} → 1 paid ACTIVE ticket "${LIVE_TICKET_CODE}"`,
    );
    console.log('');
    console.log('Try US8 — Create Booking (upcoming event):');
    console.log('  POST /api/bookings');
    console.log(
      `  { "customerId": "<any-uuid>", "eventId": "${EVENT_ID}", "ticketCategoryId": "${CATEGORY_ID}", "quantity": 1 }`,
    );
    console.log('');
    console.log('Try US13 — Check In Ticket (live event window is open):');
    console.log('  POST /api/tickets/check-in');
    console.log(
      `  { "ticketCode": "${LIVE_TICKET_CODE}", "eventId": "${LIVE_EVENT_ID}" }`,
    );
  } finally {
    await AppDataSource.destroy();
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
