Status: Active
Last updated: 2026-04-28

# Cherry Automation Branch Protection

Cherry automation V2 posts allowlisted GitHub commit statuses through Cherry-owned API endpoints. These statuses become enforcement only when the repository branch protection rules require them before merge.

Required Cherry status contexts:

- `cherry/forbidden-change`
- `cherry/docs-drift`
- `cherry/risk-gate`
- `cherry/openclaw-policy`

Without branch protection, Cherry statuses are advisory only.

Configure branch protection for protected branches to require the contexts above, keep administrator bypasses limited, and keep n8n routed through Cherry `/api/automation/*` endpoints rather than posting arbitrary status contexts directly.
