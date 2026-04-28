# Cherry n8n Minmax Workflow Pack

Status: Generated
Last updated: 2026-04-27

This directory contains 10 importable n8n workflow JSON files for Cherry development automation. The workflows are advisory and development-facing only. They do not touch Cherry payment rails and must not mutate Sessions, Ledger, Buckets, cards, payments, or other financial truth.

## Import

Import each JSON file as a single workflow in n8n. Each file contains exactly one workflow object, not an array of workflows.

The zip is expected to preserve this root folder:

```bash
cd /Users/nasr/repos/cherry
zip -r cherry-n8n-workflows.zip cherry-n8n-workflows
```

## Required Environment Variables

- `GITHUB_OWNER`
- `GITHUB_REPO`
- `GITHUB_TOKEN`
- `OPENCLAW_WEBHOOK_URL`
- `DISCORD_WEBHOOK_URL`
- `SLACK_WEBHOOK_URL`
- `EMAIL_WEBHOOK_URL`
- `NOTION_WEBHOOK_URL`
- `GOOGLE_SHEETS_WEBHOOK_URL`
- `LINEAR_JIRA_WEBHOOK_URL`
- `GITHUB_PROJECTS_WEBHOOK_URL`
- `CHERRY_API_BASE_URL`
- `CHERRY_AUTOMATION_TOKEN`

These workflows use n8n `$env.*` expressions. HTTP Request nodes use header
parameters with placeholder expressions only. No credentials are required at
import time.

## Webhook Paths

- `POST /cherry/github/workflow-completed` -> CI failure compression
- `POST /cherry/github/issue-labeled` -> OpenClaw issue router
- `POST /cherry/github/pull-request-risk` -> PR risk classifier
- `POST /cherry/github/pull-request-forbidden` -> forbidden-change detector
- `POST /cherry/runtime/degradation` -> engine degradation alerting
- `POST /cherry/simulation/result` -> simulation drift detector
- `POST /cherry/release/summary` -> release summary generator
- `POST /cherry/github/pull-request-docs-drift` -> docs drift detector

## GitHub Webhook Event Mapping

- `workflow_run.completed` -> `/cherry/github/workflow-completed`
- `issues.labeled` -> `/cherry/github/issue-labeled`
- `pull_request` -> PR risk, forbidden-change, and docs-drift workflows

## Scheduled Workflows

- `08_repo_intelligence_digest.json` runs weekly.
- `10_backlog_grooming.json` runs weekly.

## Safety Boundary

Forbidden Cherry endpoint patterns:

- `/api/session*`
- `/api/ledger*`
- `/api/bucket*`
- `/api/payment*`
- `/api/card*`
- `/api/debt*/mutate`
- any `POST`, `PATCH`, or `DELETE` endpoint that changes financial truth

Workflow `06_simulation_drift_detector` calls Cherry's `/api/automation/simulation-snapshots/compare` endpoint so snapshot history is durable in Cherry automation storage, not n8n static data.
