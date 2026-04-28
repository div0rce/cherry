# Cherry n8n Validation Report

Status: Passed
Last updated: 2026-04-27

## Parsed Files

- 01_ci_failure_compression.json
- 02_openclaw_issue_router.json
- 03_pr_risk_classifier.json
- 04_forbidden_change_detector.json
- 05_engine_degradation_alerting.json
- 06_simulation_drift_detector.json
- 07_release_summary_generator.json
- 08_repo_intelligence_digest.json
- 09_docs_drift_detector.json
- 10_backlog_grooming.json

## Workflow Names

- Cherry - CI Failure Compression
- Cherry - OpenClaw Issue Router
- Cherry - PR Risk Classifier
- Cherry - Forbidden Change Detector
- Cherry - Engine Degradation Alerting
- Cherry - Simulation Drift Detector
- Cherry - Release Summary Generator
- Cherry - Repo Intelligence Digest
- Cherry - Docs Drift Detector
- Cherry - Backlog Grooming

## Webhook Paths

- /cherry/github/workflow-completed
- /cherry/github/issue-labeled
- /cherry/github/pull-request-risk
- /cherry/github/pull-request-forbidden
- /cherry/runtime/degradation
- /cherry/simulation/result
- /cherry/release/summary
- /cherry/github/pull-request-docs-drift

## Automation Endpoints

- /api/automation/classify/pr
- /api/automation/events
- /api/automation/simulation-snapshots/compare
- /api/automation/statuses/github

## Coverage Status 1-110

Passed: all use cases 1-110 are covered.

## Credential Objects

Detected credential objects: none

## Connection Reference Check

Passed

## HTTP Failure Handling

Every HTTP Request node has `continueOnFail: true`.

## Webhook Response Mode

All Webhook nodes set `responseMode` to `responseNode`.

## Code Node Language

All Code nodes use JavaScript.

## V2 Notes

- Archive nodes call `/api/automation/events`.
- PR risk workflow calls `/api/automation/classify/pr` and `/api/automation/statuses/github`.
- Forbidden-change and docs-drift workflows call `/api/automation/statuses/github`.
- Simulation drift workflow calls `/api/automation/simulation-snapshots/compare` instead of n8n static data.

## Errors

None.
