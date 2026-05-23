-- THEORY :: Migration 0008 — lowercase brand wordmark (idempotent)
ALTER TABLE "tenant_settings" ALTER COLUMN "brand_name" SET DEFAULT 'theory';
UPDATE "tenant_settings" SET "brand_name" = 'theory' WHERE "brand_name" = 'THEORY';
