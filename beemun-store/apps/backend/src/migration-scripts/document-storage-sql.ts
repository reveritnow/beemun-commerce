export const DOCUMENT_STORAGE_TABLE_NAME = "beemun_vendor_document_file"

export const createDocumentStorageSql = `
create table if not exists "beemun_vendor_document_file" (
  "id" text not null,
  "document_id" text not null,
  "vendor_id" text not null,
  "storage_provider" text not null default 'database_mvp',
  "storage_key" text not null,
  "original_filename" text not null,
  "mime_type" text not null,
  "file_size" numeric not null,
  "raw_file_size" jsonb null,
  "content_base64" text not null,
  "metadata" jsonb null,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now(),
  "deleted_at" timestamptz null,
  constraint "beemun_vendor_document_file_pkey" primary key ("id")
);

alter table if exists "beemun_vendor_document_file"
  add column if not exists "id" text;

alter table if exists "beemun_vendor_document_file"
  add column if not exists "document_id" text;

alter table if exists "beemun_vendor_document_file"
  add column if not exists "vendor_id" text;

alter table if exists "beemun_vendor_document_file"
  add column if not exists "storage_provider" text default 'database_mvp';

alter table if exists "beemun_vendor_document_file"
  add column if not exists "storage_key" text;

alter table if exists "beemun_vendor_document_file"
  add column if not exists "original_filename" text;

alter table if exists "beemun_vendor_document_file"
  add column if not exists "mime_type" text;

alter table if exists "beemun_vendor_document_file"
  add column if not exists "file_size" numeric;

alter table if exists "beemun_vendor_document_file"
  add column if not exists "raw_file_size" jsonb;

alter table if exists "beemun_vendor_document_file"
  add column if not exists "content_base64" text;

alter table if exists "beemun_vendor_document_file"
  add column if not exists "metadata" jsonb;

alter table if exists "beemun_vendor_document_file"
  add column if not exists "created_at" timestamptz default now();

alter table if exists "beemun_vendor_document_file"
  add column if not exists "updated_at" timestamptz default now();

alter table if exists "beemun_vendor_document_file"
  add column if not exists "deleted_at" timestamptz;

create index if not exists "IDX_beemun_vendor_document_file_document"
  on "beemun_vendor_document_file" ("document_id")
  where deleted_at is null;

create index if not exists "IDX_beemun_vendor_document_file_vendor"
  on "beemun_vendor_document_file" ("vendor_id")
  where deleted_at is null;

create unique index if not exists "IDX_beemun_vendor_document_file_current"
  on "beemun_vendor_document_file" ("document_id")
  where deleted_at is null;

alter table if exists "beemun_vendor_document_file"
  drop constraint if exists "beemun_vendor_document_file_document_id_foreign";

alter table if exists "beemun_vendor_document_file"
  add constraint "beemun_vendor_document_file_document_id_foreign"
  foreign key ("document_id")
  references "beemun_vendor_document" ("id")
  on update cascade
  on delete cascade;

alter table if exists "beemun_vendor_document_file"
  drop constraint if exists "beemun_vendor_document_file_vendor_id_foreign";

alter table if exists "beemun_vendor_document_file"
  add constraint "beemun_vendor_document_file_vendor_id_foreign"
  foreign key ("vendor_id")
  references "beemun_vendor" ("id")
  on update cascade
  on delete cascade;
`