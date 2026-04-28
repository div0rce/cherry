# Cherry n8n Coverage Matrix

Status: Generated
Last updated: 2026-04-27

## Workflow Coverage

| Workflow | Covers |
| --- | --- |
| `01_ci_failure_compression` | 1, 2, 3, 4, 21-29 |
| `02_openclaw_issue_router` | 41-50 |
| `03_pr_risk_classifier` | 11-17, 30-32, 46-49 |
| `04_forbidden_change_detector` | 32-39, 48 |
| `05_engine_degradation_alerting` | 51-60 |
| `06_simulation_drift_detector` | 61-70 |
| `07_release_summary_generator` | 71-80 |
| `08_repo_intelligence_digest` | 5-10, 20, 91-100 |
| `09_docs_drift_detector` | 81-90 |
| `10_backlog_grooming` | 18-20, 40, 93-100, 106-107 |
| `Shared sink pattern` | 101-110 |

## Use Case Map

### Repo Automation

1. CI failure -> structured issue
2. CI failure -> existing issue comment
3. CI failure -> OpenClaw task
4. flaky test detector
5. dependency update triage
6. Dependabot PR classifier
7. CodeQL alert router
8. secret scan alert router
9. stale branch detector
10. stale PR detector
11. PR size classifier
12. PR risk score
13. PR domain classifier
14. PR checklist generator
15. PR summary generator
16. PR merge-block reminder
17. issue deduplication
18. issue severity labeling
19. issue owner/domain labeling
20. backlog grooming automation

### Verification Automation

21. run full verification on demand
22. rerun failed workflow
23. collect failed logs
24. summarize failure cause
25. compare failure to last passing run
26. detect changed files causing failure
27. enforce required scripts exist
28. verify migrations apply cleanly
29. verify Prisma schema drift
30. verify test coverage changed
31. verify route tests are in correct folder
32. verify no forbidden imports
33. verify no production secrets touched
34. verify no .env diff
35. verify no snapshot fraud
36. verify no deleted tests
37. verify no skipped tests added
38. verify no console.log leaks
39. verify no TODO introduced without issue
40. verify issue acceptance criteria updated

### OpenClaw Automation

41. issue labeled openclaw -> create OpenClaw task
42. OpenClaw result -> validate schema
43. OpenClaw patch -> attach summary
44. OpenClaw failure -> request retry
45. OpenClaw command log -> archive
46. OpenClaw changed engine -> require tests
47. OpenClaw changed docs only -> lighter checks
48. OpenClaw touched forbidden files -> block
49. OpenClaw PR -> mark needs-human-review
50. OpenClaw output -> generate commit message

### Cherry Engine Observability

51. degradation event -> issue
52. missing truth event -> issue
53. solver divergence event -> issue
54. impossible state event -> issue
55. temporal inconsistency event -> issue
56. candidate exclusion spike -> alert
57. simulation instability -> alert
58. score drift -> alert
59. route response mismatch -> alert
60. advisory output degradation -> alert

### Simulation Automation

61. scheduled simulation run
62. compare simulation to previous snapshot
63. detect major allocation delta
64. detect paydown strategy flip
65. detect runway collapse
66. detect debt relief regression
67. detect reward-over-safety bias
68. detect malformed candidate set
69. detect empty viable candidates
70. store simulation audit artifact

### Release Automation

71. changelog generation
72. release notes generation
73. LinkedIn draft generation
74. GitHub release draft
75. semantic version suggestion
76. breaking-change detector
77. migration warning generator
78. issue closure report
79. release risk summary
80. deployment summary

### Documentation Automation

81. docs drift detector
82. README update reminder
83. architecture doc update reminder
84. API contract doc generator
85. endpoint inventory generator
86. env var inventory generator
87. Prisma model change summary
88. test inventory summary
89. issue-to-doc linkage
90. glossary update automation

### Project Management

91. weekly progress digest
92. daily issue digest
93. blocked issue detector
94. orphaned issue detector
95. milestone progress report
96. PR-to-issue linkage checker
97. acceptance criteria completeness checker
98. roadmap update generator
99. duplicate backlog detector
100. priority decay detector

### External Integrations

101. Discord notifications
102. Slack notifications
103. email summaries
104. Notion sync
105. Google Sheets metrics export
106. Linear/Jira sync
107. GitHub Projects update
108. calendar reminder for releases
109. webhook archive to database
110. incident timeline export

## Coverage Status

All use cases 1-110 are mapped to at least one workflow or to the shared sink pattern.
