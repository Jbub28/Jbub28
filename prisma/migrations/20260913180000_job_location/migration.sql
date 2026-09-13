-- AlterTable
ALTER TABLE "jrb_records" ADD COLUMN IF NOT EXISTS "jobLocation" TEXT;
ALTER TABLE "jrb_records" ADD COLUMN IF NOT EXISTS "streetAddress" TEXT;
ALTER TABLE "jrb_records" ADD COLUMN IF NOT EXISTS "locationIdentifier" TEXT;
ALTER TABLE "jrb_records" ADD COLUMN IF NOT EXISTS "gpsCapturedAt" TIMESTAMP(3);

UPDATE "jrb_records"
SET "jobLocation" = "workLocation"
WHERE "jobLocation" IS NULL AND "workLocation" IS NOT NULL;

UPDATE "jrb_records"
SET "streetAddress" = "addressOrCoordinates"
WHERE "streetAddress" IS NULL
  AND "addressOrCoordinates" IS NOT NULL
  AND "addressOrCoordinates" !~ '^-?[0-9]+\.[0-9]+[[:space:]]*,[[:space:]]*-?[0-9]+\.[0-9]+$';
