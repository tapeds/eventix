import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitBookingTickets1717500000000 implements MigrationInterface {
  name = 'InitBookingTickets1717500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "bookings" (
        "id" uuid NOT NULL,
        "customer_id" uuid NOT NULL,
        "event_id" uuid NOT NULL,
        "ticket_category_id" uuid NOT NULL,
        "quantity" integer NOT NULL,
        "unit_price_amount" numeric(12,2) NOT NULL,
        "unit_price_currency" varchar(3) NOT NULL,
        "service_fee_amount" numeric(12,2) NOT NULL,
        "service_fee_currency" varchar(3) NOT NULL,
        "total_price_amount" numeric(12,2) NOT NULL,
        "total_price_currency" varchar(3) NOT NULL,
        "status" varchar(32) NOT NULL,
        "created_at" timestamptz NOT NULL,
        "payment_deadline" timestamptz NOT NULL,
        "paid_at" timestamptz,
        CONSTRAINT "PK_bookings" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_bookings_customer_id" ON "bookings" ("customer_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "tickets" (
        "id" uuid NOT NULL,
        "ticket_code" varchar(64) NOT NULL,
        "booking_id" uuid NOT NULL,
        "event_id" uuid NOT NULL,
        "status" varchar(32) NOT NULL,
        "issued_at" timestamptz NOT NULL,
        "checked_in_at" timestamptz,
        CONSTRAINT "PK_tickets" PRIMARY KEY ("id"),
        CONSTRAINT "FK_tickets_booking_id"
          FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_tickets_ticket_code" ON "tickets" ("ticket_code")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tickets_booking_id" ON "tickets" ("booking_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tickets_event_id" ON "tickets" ("event_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "tickets"`);
    await queryRunner.query(`DROP TABLE "bookings"`);
  }
}
