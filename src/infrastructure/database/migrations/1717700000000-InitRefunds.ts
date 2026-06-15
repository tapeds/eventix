import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitRefunds1717700000000 implements MigrationInterface {
  name = 'InitRefunds1717700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "refunds" (
        "id" uuid NOT NULL,
        "booking_id" uuid NOT NULL,
        "customer_id" uuid NOT NULL,
        "amount_amount" numeric(12,2) NOT NULL,
        "amount_currency" varchar(3) NOT NULL,
        "status" varchar(32) NOT NULL,
        "requested_at" timestamptz NOT NULL,
        "decided_at" timestamptz,
        "paid_out_at" timestamptz,
        "rejection_reason" text,
        "payment_reference" varchar(128),
        CONSTRAINT "PK_refunds" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_refunds_booking_id" ON "refunds" ("booking_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_refunds_customer_id" ON "refunds" ("customer_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_refunds_status" ON "refunds" ("status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "refunds"`);
  }
}
