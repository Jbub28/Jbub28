-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('staged', 'published', 'retired', 'superseded', 'rejected', 'unresolved', 'administrator_review_required');

-- CreateEnum
CREATE TYPE "JrbStatus" AS ENUM ('draft', 'in_progress', 'needs_attention', 'supervisor_review_required', 'ready_for_crew_briefing', 'crew_briefing_complete', 'ready_for_work', 'released_for_work', 'stop_work_active', 'rebrief_required', 'closed');

-- CreateEnum
CREATE TYPE "WorkClassification" AS ENUM ('operations_or_maintenance', 'construction', 'not_yet_determined');

-- CreateEnum
CREATE TYPE "Presence" AS ENUM ('present', 'not_present', 'not_applicable', 'need_help');

-- CreateEnum
CREATE TYPE "RoleName" AS ENUM ('field_team_member', 'employee_in_charge', 'supervisor', 'safety_reviewer', 'eei_task_library_administrator', 'direct_control_library_administrator', 'alternative_control_administrator', 'regulatory_content_administrator', 'application_administrator', 'read_only_analyst');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('local_only', 'waiting_to_sync', 'synchronized', 'sync_error', 'conflict');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "employeeNumber" TEXT,
    "passwordHash" TEXT,
    "entraObjectId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "RoleName" NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operating_areas" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "operating_areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crews" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "crews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crew_memberships" (
    "id" TEXT NOT NULL,
    "crewId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "crew_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contractors" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,

    CONSTRAINT "contractors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jrb_records" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "jrbNumber" TEXT NOT NULL,
    "status" "JrbStatus" NOT NULL DEFAULT 'draft',
    "currentVersionId" TEXT,
    "createdById" TEXT NOT NULL,
    "employeeInChargeId" TEXT,
    "supervisorId" TEXT,
    "operatingAreaId" TEXT,
    "workTypeId" TEXT,
    "workClassification" "WorkClassification" NOT NULL DEFAULT 'not_yet_determined',
    "workClassificationConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "plannedStartTime" TIMESTAMP(3),
    "workOrderNumber" TEXT,
    "oasDojmNumber" TEXT,
    "projectNumber" TEXT,
    "circuitNumber" TEXT,
    "clearanceNumber" TEXT,
    "hazardNumber" TEXT,
    "sawsNumber" TEXT,
    "locateTicketNumber" TEXT,
    "addressOrCoordinates" TEXT,
    "workLocation" TEXT,
    "gpsLatitude" DOUBLE PRECISION,
    "gpsLongitude" DOUBLE PRECISION,
    "gpsPermissionGranted" BOOLEAN NOT NULL DEFAULT false,
    "contractorInvolved" BOOLEAN NOT NULL DEFAULT false,
    "contractorCompany" TEXT,
    "emergencyAccess" TEXT,
    "communicationMethod" TEXT,
    "syncStatus" "SyncStatus" NOT NULL DEFAULT 'local_only',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jrb_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jrb_versions" (
    "id" TEXT NOT NULL,
    "jrbId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "status" "JrbStatus" NOT NULL DEFAULT 'draft',
    "workDescriptionOriginal" TEXT,
    "workDescriptionEdited" TEXT,
    "transcriptStatus" TEXT,
    "speechProvider" TEXT,
    "controlledLibrarySnapshot" JSONB,
    "releasedAt" TIMESTAMP(3),
    "releasedById" TEXT,
    "releasedRole" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jrb_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jrb_job_steps" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "phase" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "relatedTaskId" TEXT,
    "workProcedure" TEXT,
    "hazardOrExposure" TEXT,
    "highEnergyExposureId" TEXT,
    "sifPotential" TEXT,
    "specialPrecaution" TEXT,
    "energySourceControl" TEXT,
    "ppeNotes" TEXT,
    "responsiblePerson" TEXT,
    "verificationStatus" TEXT,
    "crewComment" TEXT,
    "stopWorkTrigger" TEXT,

    CONSTRAINT "jrb_job_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jrb_conditions" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "planMatchesField" BOOLEAN,
    "materialDifferenceNotes" TEXT,
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "jrb_conditions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jrb_environmental_conditions" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "choice" TEXT NOT NULL,
    "otherText" TEXT,

    CONSTRAINT "jrb_environmental_conditions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jrb_predeparture_checks" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "itemKey" TEXT NOT NULL,
    "labelExact" TEXT NOT NULL,
    "discussed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "jrb_predeparture_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jrb_jobsite_walkdowns" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "itemKey" TEXT NOT NULL,
    "labelExact" TEXT NOT NULL,
    "observed" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,

    CONSTRAINT "jrb_jobsite_walkdowns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jrb_crew_members" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "employeeOrContractorId" TEXT,
    "employer" TEXT,
    "isContractor" BOOLEAN NOT NULL DEFAULT false,
    "lateArrival" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "jrb_crew_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jrb_acknowledgments" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "crewMemberId" TEXT,
    "name" TEXT NOT NULL,
    "employeeOrContractorId" TEXT,
    "employer" TEXT,
    "acknowledgmentText" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "openConcern" BOOLEAN NOT NULL DEFAULT false,
    "jrbVersionAcknowledged" INTEGER NOT NULL,
    "acknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jrb_acknowledgments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jrb_questions" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "raisedBy" TEXT,
    "eicResponse" TEXT,
    "planChanged" BOOLEAN NOT NULL DEFAULT false,
    "jobStepId" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jrb_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jrb_post_job_reviews" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "holdOrdersReleased" BOOLEAN,
    "travelPlanReviewed" BOOLEAN,
    "finalCircleOfSafety" BOOLEAN,
    "groundsRemoved" BOOLEAN,
    "cargoSecured" BOOLEAN,
    "spotterUseCompleted" BOOLEAN,
    "noIssues" BOOLEAN,
    "rebriefWasNecessary" BOOLEAN,
    "stopWorkUsed" BOOLEAN,
    "whatWentWell" TEXT,
    "whatNeedsImprovement" TEXT,
    "bestPractices" TEXT,
    "employeeInChargeName" TEXT,
    "reviewedBy" TEXT,
    "completedAt" TIMESTAMP(3),
    "closeoutStatus" TEXT,

    CONSTRAINT "jrb_post_job_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_types" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "exactName" TEXT NOT NULL,
    "operational" BOOLEAN NOT NULL DEFAULT false,
    "sourceId" TEXT,
    "sourceLocation" TEXT,
    "sourceVersion" TEXT,
    "contentStatus" "ContentStatus" NOT NULL DEFAULT 'staged',

    CONSTRAINT "work_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eei_activities" (
    "id" TEXT NOT NULL,
    "workTypeId" TEXT NOT NULL,
    "exactName" TEXT NOT NULL,
    "sourceLocation" TEXT,
    "contentStatus" "ContentStatus" NOT NULL DEFAULT 'staged',

    CONSTRAINT "eei_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eei_tasks" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "exactName" TEXT NOT NULL,
    "sourceLocation" TEXT,
    "sourceAttribution" TEXT,
    "contentStatus" "ContentStatus" NOT NULL DEFAULT 'staged',

    CONSTRAINT "eei_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eei_task_versions" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "exactName" TEXT NOT NULL,
    "effectiveDate" TIMESTAMP(3),

    CONSTRAINT "eei_task_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_synonyms" (
    "id" TEXT NOT NULL,
    "taskId" TEXT,
    "phrase" TEXT NOT NULL,
    "workTypeCode" TEXT,
    "proposedTaskExactName" TEXT,
    "status" TEXT NOT NULL,

    CONSTRAINT "task_synonyms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_match_exceptions" (
    "id" TEXT NOT NULL,
    "versionId" TEXT,
    "originalTranscript" TEXT NOT NULL,
    "editedDescription" TEXT NOT NULL,
    "workTypeCode" TEXT NOT NULL,
    "suggestedMatches" JSONB NOT NULL,
    "matchConfidence" TEXT NOT NULL,
    "userDecision" TEXT,
    "finalSelectedTask" TEXT,
    "reviewStatus" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_match_exceptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jrb_task_selections" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "taskVersionId" TEXT NOT NULL,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "jrb_task_selections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "high_energy_exposures" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "formLabelExact" TEXT,
    "dcInventoryLabelExact" TEXT,
    "energyFamily" TEXT,
    "definitionExact" TEXT,
    "plainLanguageHelp" TEXT,
    "contentStatus" "ContentStatus" NOT NULL DEFAULT 'staged',
    "sourceLocation" TEXT,

    CONSTRAINT "high_energy_exposures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "high_energy_icon_assets" (
    "id" TEXT NOT NULL,
    "exposureId" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "isPlaceholder" BOOLEAN NOT NULL DEFAULT false,
    "sourceFilename" TEXT,
    "sourceLocation" TEXT,
    "usageNotes" TEXT,

    CONSTRAINT "high_energy_icon_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sclm_classifications" (
    "id" TEXT NOT NULL,
    "exactName" TEXT NOT NULL,
    "definition" TEXT,
    "contentStatus" "ContentStatus" NOT NULL DEFAULT 'unresolved',
    "sourceLocation" TEXT,

    CONSTRAINT "sclm_classifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_high_energy_mappings" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "exposureId" TEXT NOT NULL,
    "contentStatus" "ContentStatus" NOT NULL DEFAULT 'unresolved',
    "sourceLocation" TEXT,

    CONSTRAINT "task_high_energy_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jrb_exposures" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "exposureId" TEXT NOT NULL,
    "presence" "Presence" NOT NULL,
    "energySource" TEXT,
    "unwantedRelease" TEXT,
    "personsExposed" TEXT,
    "sifOutcome" TEXT,
    "relatedTaskId" TEXT,
    "relatedJobStepId" TEXT,
    "sclmClassification" TEXT,
    "crewConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "confirmedAt" TIMESTAMP(3),
    "whenPresent" TEXT,

    CONSTRAINT "jrb_exposures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "direct_controls" (
    "id" TEXT NOT NULL,
    "exactName" TEXT NOT NULL,
    "sourceRow" INTEGER,
    "notes" TEXT,
    "examples" TEXT,
    "sourceVersion" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "contentStatus" "ContentStatus" NOT NULL DEFAULT 'staged',
    "sourceLocation" TEXT,

    CONSTRAINT "direct_controls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "direct_control_versions" (
    "id" TEXT NOT NULL,
    "directControlId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "exactName" TEXT NOT NULL,

    CONSTRAINT "direct_control_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "high_energy_direct_control_mappings" (
    "id" TEXT NOT NULL,
    "exposureId" TEXT NOT NULL,
    "directControlId" TEXT NOT NULL,
    "contentStatus" "ContentStatus" NOT NULL DEFAULT 'staged',
    "sourceLocation" TEXT,

    CONSTRAINT "high_energy_direct_control_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_direct_control_mappings" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "directControlId" TEXT NOT NULL,
    "contentStatus" "ContentStatus" NOT NULL DEFAULT 'unresolved',

    CONSTRAINT "task_direct_control_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jrb_direct_control_selections" (
    "id" TEXT NOT NULL,
    "jrbExposureId" TEXT NOT NULL,
    "directControlId" TEXT NOT NULL,
    "planned" BOOLEAN NOT NULL DEFAULT true,
    "inPlace" BOOLEAN NOT NULL DEFAULT false,
    "checked" BOOLEAN NOT NULL DEFAULT false,
    "personResponsible" TEXT,
    "notes" TEXT,
    "noLongerEffective" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "jrb_direct_control_selections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "direct_control_verifications" (
    "id" TEXT NOT NULL,
    "selectionId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "personResponsible" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "notes" TEXT,
    "evidenceFileId" TEXT,
    "status" TEXT NOT NULL,

    CONSTRAINT "direct_control_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "direct_control_not_used_reasons" (
    "id" TEXT NOT NULL,
    "jrbExposureId" TEXT NOT NULL,
    "jrbId" TEXT NOT NULL,
    "jrbVersion" INTEGER NOT NULL,
    "jobStepId" TEXT,
    "eeiTaskId" TEXT,
    "reason" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reviewStatus" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "direct_control_not_used_reasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alternative_control_categories" (
    "id" TEXT NOT NULL,
    "exactName" TEXT NOT NULL,
    "definitionExact" TEXT NOT NULL,
    "examplesExact" TEXT,
    "sourceAlsoCallsThis" TEXT,
    "contentStatus" "ContentStatus" NOT NULL DEFAULT 'staged',

    CONSTRAINT "alternative_control_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alternative_controls" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "exactName" TEXT NOT NULL,
    "sourceWording" TEXT,
    "contentStatus" "ContentStatus" NOT NULL DEFAULT 'staged',

    CONSTRAINT "alternative_controls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alternative_control_versions" (
    "id" TEXT NOT NULL,
    "alternativeControlId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "exactName" TEXT NOT NULL,

    CONSTRAINT "alternative_control_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jrb_alternative_controls" (
    "id" TEXT NOT NULL,
    "jrbExposureId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "catalogControlId" TEXT,
    "isOther" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT NOT NULL,
    "howReducesExposure" TEXT,
    "howComplements" TEXT,
    "owner" TEXT,
    "verificationMethod" TEXT,
    "keepInPlaceMethod" TEXT,
    "startTime" TIMESTAMP(3),
    "endTimeOrRemoval" TEXT,
    "residualExposure" TEXT,
    "stopWorkTrigger" TEXT,
    "supervisorReviewed" BOOLEAN NOT NULL DEFAULT false,
    "supervisorDecision" TEXT,
    "proposedForLibrary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "jrb_alternative_controls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ppe_items" (
    "id" TEXT NOT NULL,
    "exactName" TEXT NOT NULL,
    "sourceLocation" TEXT,
    "contentStatus" "ContentStatus" NOT NULL DEFAULT 'staged',

    CONSTRAINT "ppe_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_ppe_mappings" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "ppeItemId" TEXT NOT NULL,
    "contentStatus" "ContentStatus" NOT NULL DEFAULT 'unresolved',

    CONSTRAINT "task_ppe_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regulatory_references" (
    "id" TEXT NOT NULL,
    "regulationFamily" TEXT NOT NULL,
    "citation" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "applicability" TEXT NOT NULL,
    "approvedHelpText" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "effectiveDate" TIMESTAMP(3),
    "contentOwner" TEXT,
    "reviewStatus" "ContentStatus" NOT NULL DEFAULT 'staged',
    "version" TEXT NOT NULL,

    CONSTRAINT "regulatory_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regulatory_topics" (
    "id" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,

    CONSTRAINT "regulatory_topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_regulatory_mappings" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "contentStatus" "ContentStatus" NOT NULL DEFAULT 'unresolved',

    CONSTRAINT "task_regulatory_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conditional_questions" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "promptExact" TEXT NOT NULL,
    "helpText" TEXT,
    "workTypeCode" TEXT,
    "activityName" TEXT,
    "taskNameContains" TEXT,
    "contentStatus" "ContentStatus" NOT NULL DEFAULT 'staged',
    "sourceLocation" TEXT,

    CONSTRAINT "conditional_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approvals" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "approverId" TEXT,
    "decision" TEXT NOT NULL,
    "notes" TEXT,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "condition" JSONB NOT NULL,
    "requiredRole" "RoleName" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "approval_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rebrief_events" (
    "id" TEXT NOT NULL,
    "jrbId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "explanation" TEXT,
    "fromVersion" INTEGER NOT NULL,
    "toVersion" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rebrief_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stop_work_events" (
    "id" TEXT NOT NULL,
    "jrbId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "initiatingUserId" TEXT NOT NULL,
    "relatedTaskOrStep" TEXT,
    "immediateCondition" TEXT,
    "resolutionStatus" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stop_work_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_files" (
    "id" TEXT NOT NULL,
    "versionId" TEXT,
    "association" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "scanStatus" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_recommendations" (
    "id" TEXT NOT NULL,
    "versionId" TEXT,
    "kind" TEXT NOT NULL,
    "userInput" TEXT NOT NULL,
    "originalTranscript" TEXT,
    "suggestion" JSONB NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT,
    "confidence" TEXT,
    "recordsConsidered" JSONB,
    "userDecision" TEXT,
    "confirmedResult" JSONB,
    "errorStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "originalValue" JSONB,
    "newValue" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "controlled_content_sources" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "sourceVersion" TEXT,
    "effectiveDate" TIMESTAMP(3),
    "checksum" TEXT,
    "storagePath" TEXT,
    "notes" TEXT,

    CONSTRAINT "controlled_content_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "controlled_content_imports" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "importedById" TEXT,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "report" JSONB NOT NULL,

    CONSTRAINT "controlled_content_imports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "controlled_content_exceptions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "controlled_content_exceptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "help_content" (
    "id" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "exactTerm" TEXT NOT NULL,
    "plainHelp" TEXT NOT NULL,
    "sourceNote" TEXT,

    CONSTRAINT "help_content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuration_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "configuration_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_userId_role_key" ON "user_roles"("userId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "crew_memberships_crewId_userId_key" ON "crew_memberships"("crewId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "jrb_records_jrbNumber_key" ON "jrb_records"("jrbNumber");

-- CreateIndex
CREATE UNIQUE INDEX "jrb_versions_jrbId_versionNumber_key" ON "jrb_versions"("jrbId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "work_types_code_key" ON "work_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "eei_activities_workTypeId_exactName_key" ON "eei_activities"("workTypeId", "exactName");

-- CreateIndex
CREATE UNIQUE INDEX "eei_tasks_activityId_exactName_key" ON "eei_tasks"("activityId", "exactName");

-- CreateIndex
CREATE UNIQUE INDEX "high_energy_exposures_key_key" ON "high_energy_exposures"("key");

-- CreateIndex
CREATE UNIQUE INDEX "high_energy_icon_assets_exposureId_key" ON "high_energy_icon_assets"("exposureId");

-- CreateIndex
CREATE UNIQUE INDEX "task_high_energy_mappings_taskId_exposureId_key" ON "task_high_energy_mappings"("taskId", "exposureId");

-- CreateIndex
CREATE UNIQUE INDEX "high_energy_direct_control_mappings_exposureId_directContro_key" ON "high_energy_direct_control_mappings"("exposureId", "directControlId");

-- CreateIndex
CREATE UNIQUE INDEX "task_direct_control_mappings_taskId_directControlId_key" ON "task_direct_control_mappings"("taskId", "directControlId");

-- CreateIndex
CREATE UNIQUE INDEX "alternative_control_categories_exactName_key" ON "alternative_control_categories"("exactName");

-- CreateIndex
CREATE UNIQUE INDEX "task_ppe_mappings_taskId_ppeItemId_key" ON "task_ppe_mappings"("taskId", "ppeItemId");

-- CreateIndex
CREATE UNIQUE INDEX "conditional_questions_key_key" ON "conditional_questions"("key");

-- CreateIndex
CREATE UNIQUE INDEX "controlled_content_exceptions_code_key" ON "controlled_content_exceptions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "help_content_term_key" ON "help_content"("term");

-- CreateIndex
CREATE UNIQUE INDEX "configuration_settings_key_key" ON "configuration_settings"("key");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operating_areas" ADD CONSTRAINT "operating_areas_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crews" ADD CONSTRAINT "crews_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crew_memberships" ADD CONSTRAINT "crew_memberships_crewId_fkey" FOREIGN KEY ("crewId") REFERENCES "crews"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crew_memberships" ADD CONSTRAINT "crew_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contractors" ADD CONSTRAINT "contractors_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jrb_records" ADD CONSTRAINT "jrb_records_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jrb_records" ADD CONSTRAINT "jrb_records_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jrb_records" ADD CONSTRAINT "jrb_records_employeeInChargeId_fkey" FOREIGN KEY ("employeeInChargeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jrb_records" ADD CONSTRAINT "jrb_records_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jrb_records" ADD CONSTRAINT "jrb_records_operatingAreaId_fkey" FOREIGN KEY ("operatingAreaId") REFERENCES "operating_areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jrb_records" ADD CONSTRAINT "jrb_records_workTypeId_fkey" FOREIGN KEY ("workTypeId") REFERENCES "work_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jrb_versions" ADD CONSTRAINT "jrb_versions_jrbId_fkey" FOREIGN KEY ("jrbId") REFERENCES "jrb_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jrb_job_steps" ADD CONSTRAINT "jrb_job_steps_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "jrb_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jrb_conditions" ADD CONSTRAINT "jrb_conditions_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "jrb_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jrb_environmental_conditions" ADD CONSTRAINT "jrb_environmental_conditions_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "jrb_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jrb_predeparture_checks" ADD CONSTRAINT "jrb_predeparture_checks_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "jrb_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jrb_jobsite_walkdowns" ADD CONSTRAINT "jrb_jobsite_walkdowns_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "jrb_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jrb_crew_members" ADD CONSTRAINT "jrb_crew_members_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "jrb_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jrb_acknowledgments" ADD CONSTRAINT "jrb_acknowledgments_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "jrb_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jrb_questions" ADD CONSTRAINT "jrb_questions_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "jrb_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jrb_post_job_reviews" ADD CONSTRAINT "jrb_post_job_reviews_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "jrb_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eei_activities" ADD CONSTRAINT "eei_activities_workTypeId_fkey" FOREIGN KEY ("workTypeId") REFERENCES "work_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eei_tasks" ADD CONSTRAINT "eei_tasks_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "eei_activities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eei_task_versions" ADD CONSTRAINT "eei_task_versions_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "eei_tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_synonyms" ADD CONSTRAINT "task_synonyms_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "eei_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_match_exceptions" ADD CONSTRAINT "task_match_exceptions_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "jrb_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jrb_task_selections" ADD CONSTRAINT "jrb_task_selections_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "jrb_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jrb_task_selections" ADD CONSTRAINT "jrb_task_selections_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "eei_tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "high_energy_icon_assets" ADD CONSTRAINT "high_energy_icon_assets_exposureId_fkey" FOREIGN KEY ("exposureId") REFERENCES "high_energy_exposures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jrb_exposures" ADD CONSTRAINT "jrb_exposures_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "jrb_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jrb_exposures" ADD CONSTRAINT "jrb_exposures_exposureId_fkey" FOREIGN KEY ("exposureId") REFERENCES "high_energy_exposures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_control_versions" ADD CONSTRAINT "direct_control_versions_directControlId_fkey" FOREIGN KEY ("directControlId") REFERENCES "direct_controls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "high_energy_direct_control_mappings" ADD CONSTRAINT "high_energy_direct_control_mappings_exposureId_fkey" FOREIGN KEY ("exposureId") REFERENCES "high_energy_exposures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "high_energy_direct_control_mappings" ADD CONSTRAINT "high_energy_direct_control_mappings_directControlId_fkey" FOREIGN KEY ("directControlId") REFERENCES "direct_controls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jrb_direct_control_selections" ADD CONSTRAINT "jrb_direct_control_selections_jrbExposureId_fkey" FOREIGN KEY ("jrbExposureId") REFERENCES "jrb_exposures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jrb_direct_control_selections" ADD CONSTRAINT "jrb_direct_control_selections_directControlId_fkey" FOREIGN KEY ("directControlId") REFERENCES "direct_controls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_control_verifications" ADD CONSTRAINT "direct_control_verifications_selectionId_fkey" FOREIGN KEY ("selectionId") REFERENCES "jrb_direct_control_selections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_control_not_used_reasons" ADD CONSTRAINT "direct_control_not_used_reasons_jrbExposureId_fkey" FOREIGN KEY ("jrbExposureId") REFERENCES "jrb_exposures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alternative_controls" ADD CONSTRAINT "alternative_controls_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "alternative_control_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alternative_control_versions" ADD CONSTRAINT "alternative_control_versions_alternativeControlId_fkey" FOREIGN KEY ("alternativeControlId") REFERENCES "alternative_controls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jrb_alternative_controls" ADD CONSTRAINT "jrb_alternative_controls_jrbExposureId_fkey" FOREIGN KEY ("jrbExposureId") REFERENCES "jrb_exposures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jrb_alternative_controls" ADD CONSTRAINT "jrb_alternative_controls_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "alternative_control_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regulatory_topics" ADD CONSTRAINT "regulatory_topics_referenceId_fkey" FOREIGN KEY ("referenceId") REFERENCES "regulatory_references"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "jrb_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rebrief_events" ADD CONSTRAINT "rebrief_events_jrbId_fkey" FOREIGN KEY ("jrbId") REFERENCES "jrb_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stop_work_events" ADD CONSTRAINT "stop_work_events_jrbId_fkey" FOREIGN KEY ("jrbId") REFERENCES "jrb_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_files" ADD CONSTRAINT "evidence_files_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "jrb_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_recommendations" ADD CONSTRAINT "ai_recommendations_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "jrb_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "controlled_content_imports" ADD CONSTRAINT "controlled_content_imports_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "controlled_content_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

