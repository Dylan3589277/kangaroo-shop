-- Add homepage featured product controls.
-- Safe defaults preserve existing product visibility and ordering.
ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "is_featured" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "featured_rank" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "products_is_featured_featured_rank_idx"
  ON "products" ("is_featured", "featured_rank");

-- Persist coupon/discount snapshot on orders.
-- All columns are additive and nullable/defaulted to keep existing orders safe.
ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "coupon_code" TEXT,
  ADD COLUMN IF NOT EXISTS "discount_amount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "original_subtotal" INTEGER,
  ADD COLUMN IF NOT EXISTS "promotion_id" TEXT;

CREATE INDEX IF NOT EXISTS "orders_coupon_code_idx"
  ON "orders" ("coupon_code");

CREATE INDEX IF NOT EXISTS "orders_promotion_id_idx"
  ON "orders" ("promotion_id");
