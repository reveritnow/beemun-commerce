import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260705120000 extends Migration {
  async up(): Promise<void> {
    this.addSql(`create table if not exists "beemun_vendor_application_message" ("id" text not null, "vendor_id" text not null, "author_type" text check ("author_type" in ('admin', 'applicant', 'system')) not null default 'admin', "author_user_id" text null, "body" text not null, "internal" boolean not null default false, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "beemun_vendor_application_message_pkey" primary key ("id"));`)
    this.addSql(`create index if not exists "IDX_beemun_vendor_application_message_vendor" on "beemun_vendor_application_message" ("vendor_id") where deleted_at is null;`)

    this.addSql(`create table if not exists "beemun_vendor_application_task" ("id" text not null, "vendor_id" text not null, "title" text not null, "description" text null, "status" text check ("status" in ('pending', 'completed', 'cancelled')) not null default 'pending', "requested_by_user_id" text null, "completed_at" timestamptz null, "due_at" timestamptz null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "beemun_vendor_application_task_pkey" primary key ("id"));`)
    this.addSql(`create index if not exists "IDX_beemun_vendor_application_task_vendor_status" on "beemun_vendor_application_task" ("vendor_id", "status") where deleted_at is null;`)

    this.addSql(`alter table if exists "beemun_vendor_application_message" add constraint "beemun_vendor_application_message_vendor_id_foreign" foreign key ("vendor_id") references "beemun_vendor" ("id") on update cascade on delete cascade;`)
    this.addSql(`alter table if exists "beemun_vendor_application_task" add constraint "beemun_vendor_application_task_vendor_id_foreign" foreign key ("vendor_id") references "beemun_vendor" ("id") on update cascade on delete cascade;`)
  }

  async down(): Promise<void> {
    this.addSql(`drop table if exists "beemun_vendor_application_task" cascade;`)
    this.addSql(`drop table if exists "beemun_vendor_application_message" cascade;`)
  }
}
