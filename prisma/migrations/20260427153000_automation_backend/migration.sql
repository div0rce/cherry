-- Add durable development-automation storage for n8n V2 enforcement.

CREATE TABLE "AutomationEvent" (
  "id" TEXT NOT NULL,
  "repo" TEXT NOT NULL,
  "sha" TEXT,
  "event" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "workflow" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "classifierVersion" TEXT NOT NULL,
  "outputHash" TEXT NOT NULL,
  "rawPayload" JSONB NOT NULL,
  "normalizedEvent" JSONB NOT NULL,
  "classifierOutput" JSONB NOT NULL,
  "prNumber" INTEGER,
  "issueNumber" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AutomationEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SimulationAutomationSnapshot" (
  "id" TEXT NOT NULL,
  "repo" TEXT NOT NULL,
  "scopeKey" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "classifierVersion" TEXT NOT NULL,
  "snapshot" JSONB NOT NULL,
  "comparisonOutput" JSONB NOT NULL,
  "outputHash" TEXT NOT NULL,
  "previousSnapshotId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SimulationAutomationSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AutomationStatusCheck" (
  "id" TEXT NOT NULL,
  "repo" TEXT NOT NULL,
  "sha" TEXT NOT NULL,
  "context" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "targetUrl" TEXT,
  "sourceWorkflow" TEXT NOT NULL,
  "automationEventId" TEXT,
  "classifierVersion" TEXT NOT NULL,
  "outputHash" TEXT NOT NULL,
  "statusIdempotencyKey" TEXT NOT NULL,
  "githubResponse" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AutomationStatusCheck_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "automation_event__idempotency_key__unique" ON "AutomationEvent"("idempotencyKey");
CREATE INDEX "AutomationEvent_repo_sha_idx" ON "AutomationEvent"("repo", "sha");
CREATE INDEX "AutomationEvent_repo_prNumber_idx" ON "AutomationEvent"("repo", "prNumber");
CREATE INDEX "AutomationEvent_repo_issueNumber_idx" ON "AutomationEvent"("repo", "issueNumber");
CREATE INDEX "AutomationEvent_workflow_createdAt_idx" ON "AutomationEvent"("workflow", "createdAt");
CREATE INDEX "AutomationEvent_classifierVersion_idx" ON "AutomationEvent"("classifierVersion");

CREATE UNIQUE INDEX "simulation_automation_snapshot__scope_run_version__unique" ON "SimulationAutomationSnapshot"("scopeKey", "runId", "classifierVersion");
CREATE INDEX "SimulationAutomationSnapshot_repo_scopeKey_idx" ON "SimulationAutomationSnapshot"("repo", "scopeKey");
CREATE INDEX "SimulationAutomationSnapshot_scopeKey_createdAt_idx" ON "SimulationAutomationSnapshot"("scopeKey", "createdAt");
CREATE INDEX "SimulationAutomationSnapshot_classifierVersion_idx" ON "SimulationAutomationSnapshot"("classifierVersion");

CREATE UNIQUE INDEX "automation_status_check__status_idempotency_key__unique" ON "AutomationStatusCheck"("statusIdempotencyKey");
CREATE INDEX "AutomationStatusCheck_repo_sha_idx" ON "AutomationStatusCheck"("repo", "sha");
CREATE INDEX "AutomationStatusCheck_repo_sha_context_idx" ON "AutomationStatusCheck"("repo", "sha", "context");
CREATE INDEX "AutomationStatusCheck_automationEventId_idx" ON "AutomationStatusCheck"("automationEventId");
CREATE INDEX "AutomationStatusCheck_classifierVersion_idx" ON "AutomationStatusCheck"("classifierVersion");

ALTER TABLE "AutomationStatusCheck"
  ADD CONSTRAINT "automation_status_check__automation_event_id__fk"
  FOREIGN KEY ("automationEventId") REFERENCES "AutomationEvent"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
