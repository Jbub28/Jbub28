-- AlterTable
ALTER TABLE "jrb_versions" ADD COLUMN IF NOT EXISTS "briefingTranscript" TEXT;
ALTER TABLE "jrb_versions" ADD COLUMN IF NOT EXISTS "highEnergyReviewedAt" TIMESTAMP(3);
ALTER TABLE "jrb_versions" ADD COLUMN IF NOT EXISTS "briefingScreenCompletedAt" TIMESTAMP(3);

ALTER TABLE "rebrief_events" ADD COLUMN IF NOT EXISTS "transcript" TEXT;
ALTER TABLE "rebrief_events" ADD COLUMN IF NOT EXISTS "delta" JSONB;

ALTER TABLE "stop_work_events" ADD COLUMN IF NOT EXISTS "correctiveAction" TEXT;
ALTER TABLE "stop_work_events" ADD COLUMN IF NOT EXISTS "affectedHazard" TEXT;
ALTER TABLE "stop_work_events" ADD COLUMN IF NOT EXISTS "transcript" TEXT;
ALTER TABLE "stop_work_events" ADD COLUMN IF NOT EXISTS "rebriefOccurred" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "stop_work_events" ADD COLUMN IF NOT EXISTS "resumedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "conversation_sessions" (
    "id" TEXT NOT NULL,
    "jrbId" TEXT NOT NULL,
    "versionId" TEXT,
    "kind" TEXT NOT NULL,
    "transcript" TEXT NOT NULL,
    "segments" JSONB,
    "provider" TEXT NOT NULL,
    "model" TEXT,
    "audioDiscarded" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "conversation_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "conversation_facts" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "jrbId" TEXT NOT NULL,
    "versionId" TEXT,
    "category" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "sourceSegment" TEXT,
    "confidence" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "displayOnJrb" BOOLEAN NOT NULL DEFAULT false,
    "catalogId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "conversation_facts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "briefing_assessments" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "hazardsAddressed" BOOLEAN NOT NULL DEFAULT false,
    "proceduresAddressed" BOOLEAN NOT NULL DEFAULT false,
    "precautionsAddressed" BOOLEAN NOT NULL DEFAULT false,
    "energyControlsAddressed" BOOLEAN NOT NULL DEFAULT false,
    "ppeAddressed" BOOLEAN NOT NULL DEFAULT false,
    "evidence" JSONB,
    "followUps" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "briefing_assessments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "briefing_assessments_versionId_key" ON "briefing_assessments"("versionId");
CREATE INDEX IF NOT EXISTS "conversation_sessions_jrbId_idx" ON "conversation_sessions"("jrbId");
CREATE INDEX IF NOT EXISTS "conversation_facts_jrbId_category_idx" ON "conversation_facts"("jrbId", "category");
CREATE INDEX IF NOT EXISTS "conversation_facts_versionId_idx" ON "conversation_facts"("versionId");

ALTER TABLE "conversation_sessions" ADD CONSTRAINT "conversation_sessions_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "jrb_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conversation_facts" ADD CONSTRAINT "conversation_facts_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "conversation_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "briefing_assessments" ADD CONSTRAINT "briefing_assessments_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "jrb_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
