-- Additive location + supervisor quality assessment fields. Do not reset data.

ALTER TABLE "jrb_records" ADD COLUMN IF NOT EXISTS "nearestTraumaHospital" TEXT;
ALTER TABLE "jrb_records" ADD COLUMN IF NOT EXISTS "nearestTraumaHospitalAddress" TEXT;
ALTER TABLE "jrb_records" ADD COLUMN IF NOT EXISTS "nearestTraumaHospitalLevel" TEXT;
ALTER TABLE "jrb_records" ADD COLUMN IF NOT EXISTS "nearestTraumaHospitalDistanceMiles" DOUBLE PRECISION;
ALTER TABLE "jrb_records" ADD COLUMN IF NOT EXISTS "geocodeSource" TEXT;

CREATE TABLE IF NOT EXISTS "jrb_quality_assessments" (
    "id" TEXT NOT NULL,
    "jrbId" TEXT NOT NULL,
    "observerUserId" TEXT NOT NULL,
    "observerName" TEXT NOT NULL,
    "observerRole" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "totalWeightedScore" INTEGER NOT NULL,
    "maxScore" INTEGER NOT NULL DEFAULT 54,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "jrb_quality_assessments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "jrb_quality_assessments_jrbId_idx" ON "jrb_quality_assessments"("jrbId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'jrb_quality_assessments_jrbId_fkey'
  ) THEN
    ALTER TABLE "jrb_quality_assessments"
      ADD CONSTRAINT "jrb_quality_assessments_jrbId_fkey"
      FOREIGN KEY ("jrbId") REFERENCES "jrb_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
