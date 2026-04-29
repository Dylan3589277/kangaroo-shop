-- P0 platform import foundation
-- Safe additive migration: product metadata + platform listing/import job tables.

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "title_ja" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "brand" TEXT;

CREATE TABLE IF NOT EXISTS "product_variants" (
  "id" TEXT NOT NULL,
  "product_id" TEXT NOT NULL,
  "sku" TEXT,
  "option_name" TEXT,
  "option_value" TEXT,
  "price" INTEGER,
  "stock" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "product_platform_listings" (
  "id" TEXT NOT NULL,
  "product_id" TEXT NOT NULL,
  "variant_id" TEXT,
  "platform" TEXT NOT NULL,
  "platform_item_id" TEXT,
  "platform_sku" TEXT,
  "platform_price" INTEGER,
  "platform_url" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "raw_data" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "product_platform_listings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "sync_jobs" (
  "id" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "file_name" TEXT,
  "total_rows" INTEGER NOT NULL DEFAULT 0,
  "done_rows" INTEGER NOT NULL DEFAULT 0,
  "error_rows" INTEGER NOT NULL DEFAULT 0,
  "meta" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sync_jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "sync_job_items" (
  "id" TEXT NOT NULL,
  "sync_job_id" TEXT NOT NULL,
  "row_index" INTEGER NOT NULL,
  "platform_sku" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "product_id" TEXT,
  "error_msg" TEXT,
  "raw_row" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sync_job_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "product_variants_product_id_idx" ON "product_variants"("product_id");
CREATE INDEX IF NOT EXISTS "product_platform_listings_product_id_idx" ON "product_platform_listings"("product_id");
CREATE INDEX IF NOT EXISTS "product_platform_listings_platform_idx" ON "product_platform_listings"("platform");
CREATE INDEX IF NOT EXISTS "product_platform_listings_platform_item_id_idx" ON "product_platform_listings"("platform_item_id");
CREATE INDEX IF NOT EXISTS "sync_jobs_status_idx" ON "sync_jobs"("status");
CREATE INDEX IF NOT EXISTS "sync_jobs_platform_idx" ON "sync_jobs"("platform");
CREATE INDEX IF NOT EXISTS "sync_job_items_sync_job_id_idx" ON "sync_job_items"("sync_job_id");
CREATE INDEX IF NOT EXISTS "sync_job_items_status_idx" ON "sync_job_items"("status");

DO $$ BEGIN
  ALTER TABLE "product_variants"
    ADD CONSTRAINT "product_variants_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "product_platform_listings"
    ADD CONSTRAINT "product_platform_listings_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "product_platform_listings"
    ADD CONSTRAINT "product_platform_listings_variant_id_fkey"
    FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "sync_job_items"
    ADD CONSTRAINT "sync_job_items_sync_job_id_fkey"
    FOREIGN KEY ("sync_job_id") REFERENCES "sync_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
