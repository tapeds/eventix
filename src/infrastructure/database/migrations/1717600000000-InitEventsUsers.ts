import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitEventsUsers1717600000000 implements MigrationInterface {
  name = 'InitEventsUsers1717600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "events" (
        "id" uuid NOT NULL,
        "name" varchar(255) NOT NULL,
        "description" text,
        "start_date" timestamptz NOT NULL,
        "end_date" timestamptz NOT NULL,
        "location" varchar(255),
        "max_capacity" integer NOT NULL,
        "status" varchar(32) NOT NULL,
        CONSTRAINT "PK_events" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_events_status" ON "events" ("status")`,
    );

    await queryRunner.query(`
      CREATE TABLE "ticket_categories" (
        "id" uuid NOT NULL,
        "event_id" uuid NOT NULL,
        "name" varchar(255) NOT NULL,
        "price_amount" numeric(12,2) NOT NULL,
        "price_currency" varchar(3) NOT NULL,
        "quota" integer NOT NULL,
        "sales_start_date" timestamptz NOT NULL,
        "sales_end_date" timestamptz NOT NULL,
        "status" varchar(32) NOT NULL,
        CONSTRAINT "PK_ticket_categories" PRIMARY KEY ("id"),
        CONSTRAINT "FK_ticket_categories_event_id"
          FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_ticket_categories_event_id" ON "ticket_categories" ("event_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL,
        "name" varchar(100) NOT NULL,
        "email" varchar(320) NOT NULL,
        "role" varchar(32) NOT NULL,
        "password_hash" varchar(255) NOT NULL,
        "created_at" timestamptz NOT NULL,
        "updated_at" timestamptz NOT NULL,
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_users_email" ON "users" ("email")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TABLE "ticket_categories"`);
    await queryRunner.query(`DROP TABLE "events"`);
  }
}
