import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260705153000 extends Migration {
  async up(): Promise<void> {
    this.addSql(`create table if not exists "beemun_vendor_document_file" ("id" text not null, "document_id" text not null, "vendor_id" text not null, "storage_provider" text not null default 'database_mvp', "storage_key" text not null, "original_filename" text not null, "mime_type" text not null, "file_size" numeric not null, "raw_file_size" jsonb null, "content_base64" text not null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "beemun_vendor_document_file_pkey" primary key ("id"));`)
    this.addSql(`alter table if exists "beemun_vendor_document_file" add column if not exists "raw_file_size" jsonb null;`)
    this.addSql(`create index if not exists "IDX_beemun_vendor_document_file_document" on "beemun_vendor_document_file" ("document_id") where deleted_at is null;`)
    this.addSql(`create index if not exists "IDX_beemun_vendor_document_file_vendor" on "beemun_vendor_document_file" ("vendor_id") where deleted_at is null;`)
    this.addSql(`create unique index if not exists "IDX_beemun_vendor_document_file_current" on "beemun_vendor_document_file" ("document_id") where deleted_at is null;`)
    this.addSql(`alter table if exists "beemun_vendor_document_file" add constraint "beemun_vendor_document_file_document_id_foreign" foreign key ("document_id") references "beemun_vendor_document" ("id") on update cascade on delete cascade;`)
    this.addSql(`alter table if exists "beemun_vendor_document_file" add constraint "beemun_vendor_document_file_vendor_id_foreign" foreign key ("vendor_id") references "beemun_vendor" ("id") on update cascade on delete cascade;`)
  }

  async down(): Promise<void> {
    this.addSql(`drop table if exists "beemun_vendor_document_file" cascade;`)
  }
}
