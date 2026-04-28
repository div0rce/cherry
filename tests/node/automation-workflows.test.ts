import * as assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vm from 'node:vm';
import { z } from 'zod';

const repoRoot = process.cwd();
const workflowDir = path.join(repoRoot, 'cherry-n8n-workflows');
const workflowZip = path.join(repoRoot, 'cherry-n8n-workflows.zip');
const expectedWorkflowNames = new Map([
  ['01_ci_failure_compression.json', 'Cherry - CI Failure Compression'],
  ['02_openclaw_issue_router.json', 'Cherry - OpenClaw Issue Router'],
  ['03_pr_risk_classifier.json', 'Cherry - PR Risk Classifier'],
  ['04_forbidden_change_detector.json', 'Cherry - Forbidden Change Detector'],
  ['05_engine_degradation_alerting.json', 'Cherry - Engine Degradation Alerting'],
  ['06_simulation_drift_detector.json', 'Cherry - Simulation Drift Detector'],
  ['07_release_summary_generator.json', 'Cherry - Release Summary Generator'],
  ['08_repo_intelligence_digest.json', 'Cherry - Repo Intelligence Digest'],
  ['09_docs_drift_detector.json', 'Cherry - Docs Drift Detector'],
  ['10_backlog_grooming.json', 'Cherry - Backlog Grooming'],
] as const);
const allWorkflowFiles = [...expectedWorkflowNames.keys()].sort();
const prWorkflowFiles = [
  '03_pr_risk_classifier.json',
  '04_forbidden_change_detector.json',
  '09_docs_drift_detector.json',
] as const;
const expectedWorkflowDocs = [
  'README.md',
  'COVERAGE_MATRIX.md',
  'VALIDATION_REPORT.md',
] as const;
const requiredCherryEndpoints = [
  '/api/automation/classify/pr',
  '/api/automation/events',
  '/api/automation/statuses/github',
] as const;
const forbiddenAuthorityNodeNames = new Set([
  'Score Risk',
  'Detect Forbidden Changes',
  'Detect Docs Drift',
]);

const forbiddenAuthorityPayloadPatterns = [
  /\briskScore\b/,
  /\$json\.riskScore\b/,
  /\$json\.forbidden\b/,
  /\$json\.drift\b/,
  /String\(\$json\.riskScore/,
  /statusRequest\?\.context/,
  /statusRequest\?\.state/,
  /statusRequest\?\.description/,
  /\?\?\s*'cherry\/risk-gate'/,
  /\?\?\s*'cherry\/forbidden-change'/,
  /\?\?\s*'cherry\/docs-drift'/,
  /risk\.statusRequest/,
  /forbiddenChange\.statusRequest/,
  /docsDrift\.statusRequest/,
];

const forbiddenStatusIdentityFallbackPatterns = [
  /\?\?\s*'div0rce\/cherry'/,
  /\?\?\s*'unknown-sha'/,
  /\?\?\s*'post-cherry-status'/,
  /\?\?\s*'pr-automation@1/,
];

const WorkflowSchema = z
  .object({
    name: z.unknown().optional(),
    nodes: z
      .array(
        z
          .object({
            name: z.unknown().optional(),
            parameters: z.unknown().optional(),
          })
          .passthrough()
      )
      .optional(),
    connections: z.record(z.string(), z.unknown()).optional(),
    settings: z.unknown().optional(),
  })
  .passthrough();

type WorkflowNode = {
  name?: unknown;
  id?: unknown;
  type?: unknown;
  typeVersion?: unknown;
  position?: unknown;
  parameters?: unknown;
  disabled?: unknown;
};

type Workflow = z.infer<typeof WorkflowSchema>;

function nodeByName(nodes: WorkflowNode[], name: string): WorkflowNode {
  const node = nodes.find((candidate) => candidate.name === name);
  assert.notEqual(node, undefined, `workflow must contain ${name}`);
  return node as WorkflowNode;
}

function connectionTargets(workflow: z.infer<typeof WorkflowSchema>, source: string): string[] {
  const connections = workflow.connections;
  if (connections === undefined) return [];
  const sourceConnections = connections[source];
  if (sourceConnections === null || typeof sourceConnections !== 'object') return [];
  const main = (sourceConnections as Record<string, unknown>)['main'];
  if (!Array.isArray(main)) return [];
  return main.flatMap((group) => {
    if (!Array.isArray(group)) return [];
    return group
      .map((connection) => {
        if (connection === null || typeof connection !== 'object') return null;
        const node = (connection as Record<string, unknown>)['node'];
        return typeof node === 'string' ? node : null;
      })
      .filter((node): node is string => node !== null);
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && Array.isArray(value) === false;
}

async function loadWorkflow(fileName: string): Promise<{ raw: string; workflow: Workflow }> {
  const absolutePath = path.join(workflowDir, fileName);
  const raw = fs.readFileSync(absolutePath, 'utf8');
  const parsed = (await new Response(raw).json()) as unknown;
  assert.equal(Array.isArray(parsed), false, `${fileName} must contain one workflow object`);
  return { raw, workflow: WorkflowSchema.parse(parsed) };
}

function allConnectionTargets(workflow: Workflow): string[] {
  const out: string[] = [];
  for (const source of Object.keys(workflow.connections ?? {})) {
    out.push(...connectionTargets(workflow, source));
  }
  return out;
}

function reachableNodes(workflow: Workflow, start: string): Set<string> {
  const seen = new Set<string>();
  const queue = [start];
  while (queue.length > 0) {
    const current = queue.shift() as string;
    if (seen.has(current)) continue;
    seen.add(current);
    for (const target of connectionTargets(workflow, current)) {
      if (!seen.has(target)) queue.push(target);
    }
  }
  return seen;
}

function headerValue(node: WorkflowNode, headerName: string): string {
  const parameters = isRecord(node.parameters) ? node.parameters : {};
  const headerParameters = parameters['headerParameters'];
  if (!isRecord(headerParameters)) return '';
  const parametersArray = headerParameters['parameters'];
  if (!Array.isArray(parametersArray)) return '';
  const entries: unknown[] = parametersArray;
  const match: unknown = entries.find(
    (entry) =>
      isRecord(entry) &&
      String(entry['name']).toLowerCase() === headerName.toLowerCase()
  );
  return isRecord(match) ? String(match['value'] ?? '') : '';
}

async function assertWorkflowIntegrity(): Promise<void> {
  const actualJsonFiles = fs
    .readdirSync(workflowDir)
    .filter((file) => file.endsWith('.json'))
    .sort();
  assert.deepEqual(actualJsonFiles, allWorkflowFiles, 'workflow JSON file set must be stable');

  const seenNames = new Set<string>();
  const webhookPaths: string[] = [];
  const workflowRaw = new Map<string, string>();
  for (const fileName of allWorkflowFiles) {
    const { raw, workflow } = await loadWorkflow(fileName);
    workflowRaw.set(fileName, raw);
    assert.equal(workflow.name, expectedWorkflowNames.get(fileName), `${fileName} name drifted`);
    assert.equal(seenNames.has(String(workflow.name)), false, `${fileName} duplicate name`);
    seenNames.add(String(workflow.name));
    assert.ok(Array.isArray(workflow.nodes), `${fileName} must have nodes array`);
    assert.ok(isRecord(workflow.connections), `${fileName} must have connections object`);
    assert.ok(isRecord(workflow.settings), `${fileName} must have settings object`);
    assert.equal(
      (workflow.settings as Record<string, unknown>)['executionOrder'],
      'v1',
      `${fileName} must use executionOrder v1`
    );

    const nodes = (workflow.nodes ?? []) as WorkflowNode[];
    const nodeNames = new Set<string>();
    const triggerNodes: WorkflowNode[] = [];
    const respondNodes: WorkflowNode[] = [];
    for (const node of nodes) {
      assert.equal(typeof node.id, 'string', `${fileName} node must have id`);
      assert.equal(typeof node.name, 'string', `${fileName} node must have name`);
      assert.equal(typeof node.type, 'string', `${fileName} node ${String(node.name)} must have type`);
      assert.equal(
        typeof node.typeVersion,
        'number',
        `${fileName} node ${String(node.name)} must have typeVersion`
      );
      assert.ok(
        Array.isArray(node.position) && node.position.length === 2,
        `${fileName} node ${String(node.name)} must have x/y position`
      );
      assert.ok(
        isRecord(node.parameters),
        `${fileName} node ${String(node.name)} must have parameters object`
      );
      assert.equal(nodeNames.has(String(node.name)), false, `${fileName} duplicate node name`);
      nodeNames.add(String(node.name));
      if (
        node.type === 'n8n-nodes-base.webhook' ||
        node.type === 'n8n-nodes-base.scheduleTrigger' ||
        node.type === 'n8n-nodes-base.manualTrigger'
      ) {
        triggerNodes.push(node);
      }
      if (node.type === 'n8n-nodes-base.respondToWebhook') {
        respondNodes.push(node);
      }
      if (node.type === 'n8n-nodes-base.webhook') {
        const parameters = node.parameters as Record<string, unknown>;
        assert.equal(parameters['responseMode'], 'responseNode', `${fileName} webhook must use responseNode`);
        assert.equal(typeof parameters['path'], 'string', `${fileName} webhook path missing`);
        webhookPaths.push(String(parameters['path']));
      }
      if (node.type === 'n8n-nodes-base.httpRequest') {
        assert.notEqual(
          node.disabled,
          true,
          `${fileName} HTTP node ${String(node.name)} must not be disabled`
        );
      }
    }

    assert.ok(triggerNodes.length > 0, `${fileName} must have a trigger node`);
    assert.equal(
      triggerNodes.length === 1 && triggerNodes[0]?.type === 'n8n-nodes-base.manualTrigger',
      false,
      `${fileName} production workflow must not rely on Manual Trigger only`
    );

    for (const source of Object.keys(workflow.connections ?? {})) {
      assert.ok(nodeNames.has(source), `${fileName} connection source missing node: ${source}`);
    }
    for (const target of allConnectionTargets(workflow)) {
      assert.ok(nodeNames.has(target), `${fileName} connection target missing node: ${target}`);
    }

    for (const webhook of nodes.filter((node) => node.type === 'n8n-nodes-base.webhook')) {
      const reachable = reachableNodes(workflow, String(webhook.name));
      assert.ok(
        respondNodes.some((node) => reachable.has(String(node.name))),
        `${fileName} webhook must reach Respond to Webhook`
      );
    }
  }
  assert.equal(new Set(webhookPaths).size, webhookPaths.length, 'webhook paths must be unique');

  for (const endpoint of requiredCherryEndpoints) {
    assert.ok(
      [...workflowRaw.values()].some((raw) => raw.includes(endpoint)),
      `workflow pack must call ${endpoint}`
    );
  }
}

async function assertWorkflowHttpSafety(): Promise<void> {
  for (const fileName of allWorkflowFiles) {
    const { raw, workflow } = await loadWorkflow(fileName);
    assert.equal(/api\.github\.com\/repos\/[^'"]+\/statuses\//.test(raw), false, `${fileName} must not call GitHub statuses directly`);
    assert.equal(/\/check-runs\b|\/check-suites\b/.test(raw), false, `${fileName} must not call GitHub Checks API directly`);
    assert.equal(/localhost|127\.0\.0\.1/.test(raw), false, `${fileName} must not hardcode local URLs`);
    assert.equal(/"credentials"\s*:/.test(raw), false, `${fileName} must not contain credentials object`);
    assert.equal(/credentialId|password|apiKey|webhookSecret/i.test(raw), false, `${fileName} must not contain credential identifiers or secret fields`);
    assert.equal(
      /ghp_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|\bsk-[A-Za-z0-9_-]{20,}|xox[baprs]-[A-Za-z0-9-]{20,}/.test(raw),
      false,
      `${fileName} must not contain literal secret tokens`
    );
    assert.equal(
      /\/api\/(sessions?|ledgers?|buckets?|payments?|cards?)(\/|$)|\/api\/debts?(\/.*)?\/mutate\b/i.test(raw),
      false,
      `${fileName} must not call forbidden Cherry finance endpoints`
    );

      const nodes = (workflow.nodes ?? []) as WorkflowNode[];
    for (const node of nodes) {
      if (node.type !== 'n8n-nodes-base.httpRequest') continue;
      assert.equal(
        node.disabled === true,
        false,
        `${fileName} HTTP node ${String(node.name)} must not be disabled`
      );
      assert.equal(
        (node as { continueOnFail?: unknown }).continueOnFail,
        true,
        `${fileName} HTTP node ${String(node.name)} must continueOnFail`
      );
      const parameters = isRecord(node.parameters) ? node.parameters : {};
      const url = String(parameters['url'] ?? '');
      if (url.includes('/api/automation/') || url.includes('CHERRY_API_BASE_URL')) {
        assert.ok(url.includes('$env.CHERRY_API_BASE_URL'), `${fileName} Cherry call must use $env.CHERRY_API_BASE_URL`);
        assert.ok(
          headerValue(node, 'Authorization').includes('$env.CHERRY_AUTOMATION_TOKEN'),
          `${fileName} Cherry call must use $env.CHERRY_AUTOMATION_TOKEN`
        );
      }
    }
  }
}

function assertZipMatchesFolder(): void {
  assert.ok(fs.existsSync(workflowZip), 'cherry-n8n-workflows.zip must exist');
  const entries = execFileSync('unzip', ['-Z1', workflowZip], {
    cwd: repoRoot,
    encoding: 'utf8',
  })
    .split('\n')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  assert.ok(
    entries.every((entry) => entry === 'cherry-n8n-workflows/' || entry.startsWith('cherry-n8n-workflows/')),
    'zip root must contain cherry-n8n-workflows/ only'
  );
  const zippedFiles = entries
    .filter((entry) => entry.endsWith('/') === false)
    .map((entry) => entry.replace(/^cherry-n8n-workflows\//, ''))
    .sort();
  const folderFiles = fs
    .readdirSync(workflowDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort();
  assert.deepEqual(zippedFiles, folderFiles, 'zip and workflow folder file sets must match');
  assert.deepEqual(
    zippedFiles.filter((file) => file.endsWith('.json')),
    allWorkflowFiles,
    'zip and folder workflow JSON filenames must match'
  );
  for (const file of [...allWorkflowFiles, ...expectedWorkflowDocs]) {
    const folderContent = fs.readFileSync(path.join(workflowDir, file), 'utf8');
    const zipContent = execFileSync(
      'unzip',
      ['-p', workflowZip, `cherry-n8n-workflows/${file}`],
      { cwd: repoRoot, encoding: 'utf8' }
    );
    assert.equal(zipContent, folderContent, `zip entry ${file} must match folder source`);
  }
}

function normalizeChangedFiles(jsCode: string, items: Array<{ json: unknown }>): unknown[] {
  const output = vm.runInNewContext(`(() => {\n${jsCode}\n})()`, {
    $input: { all: () => items },
    $items: (name: string) =>
      name === 'Normalize PR' ? [{ json: { repo: 'div0rce/cherry' } }] : [],
  }) as Array<{ json: { files?: unknown[] } }>;
  return output[0]?.json.files ?? [];
}

function normalizePr(jsCode: string, item: { json: unknown }): Record<string, unknown> {
  const output = vm.runInNewContext(`(() => {\n${jsCode}\n})()`, {
    $input: { first: () => item },
  }) as Array<{ json: Record<string, unknown> }>;
  return output[0]?.json ?? {};
}

function assertPreservesReturnedFiles(
  label: string,
  jsCode: string,
  items: Array<{ json: unknown }>
): void {
  const files = normalizeChangedFiles(jsCode, items);
  assert.ok(
    files.length > 0,
    `${label}: GitHub response contained files but normalized output was empty`
  );
}

await assertWorkflowIntegrity();
await assertWorkflowHttpSafety();
assertZipMatchesFolder();

for (const fileName of prWorkflowFiles) {
  const { raw, workflow } = await loadWorkflow(fileName);
  const nodes = (Array.isArray(workflow.nodes) ? workflow.nodes : []) as WorkflowNode[];
  const nodeNames = nodes.map((node) => String(node.name ?? ''));

  for (const forbiddenName of forbiddenAuthorityNodeNames) {
    assert.equal(
      nodeNames.includes(forbiddenName),
      false,
      `${fileName} must not contain local authority node ${forbiddenName}`
    );
  }

  assert.equal(
    nodeNames.includes('Classify PR In Cherry'),
    true,
    `${fileName} must call Cherry PR classifier`
  );
  assert.equal(
    nodeNames.includes('Normalize Changed Files'),
    true,
    `${fileName} must normalize changed files before Cherry classification`
  );
  assert.deepEqual(
    connectionTargets(workflow, 'Fetch Changed Files'),
    ['Normalize Changed Files'],
    `${fileName} must route Fetch Changed Files to Normalize Changed Files`
  );
  assert.deepEqual(
    connectionTargets(workflow, 'Normalize Changed Files'),
    ['Classify PR In Cherry'],
    `${fileName} must route Normalize Changed Files to Classify PR In Cherry`
  );
  assert.equal(
    nodeNames.includes('Require Status Payload'),
    true,
    `${fileName} must fail closed when Cherry omits required status payload fields`
  );
  assert.equal(
    nodeNames.includes('IF: Has Status Payload?'),
    true,
    `${fileName} must branch before posting status`
  );
  assert.deepEqual(
    connectionTargets(workflow, 'Require Status Payload'),
    ['IF: Has Status Payload?'],
    `${fileName} must route status guard to status-payload IF`
  );

  for (const pattern of forbiddenAuthorityPayloadPatterns) {
    assert.equal(
      pattern.test(raw),
      false,
      `${fileName} must not synthesize local scoring/detection authority with ${pattern}`
    );
  }
  assert.match(
    raw,
    /Cherry status payload missing required fields\. Refusing to post status\./,
    `${fileName} must include safe missing-status-payload refusal`
  );
  assert.match(
    raw,
    /if \(!event\.sha\) missing\.push\('sha'\);/,
    `${fileName} must fail closed when status payload sha is absent`
  );
  assert.match(
    raw,
    /do_not_post_status/,
    `${fileName} must refuse to post status when Cherry omits required status payload fields`
  );

  assert.equal(
    /Array\.isArray\(\$json\)\s*\?\s*\$json\s*:\s*\[\]/.test(raw),
    false,
    `${fileName} must not drop changed files with Array.isArray($json) fallback`
  );
  const classifyNode = nodeByName(nodes, 'Classify PR In Cherry');
  const classifyParameters = classifyNode.parameters;
  assert.notEqual(classifyParameters, null);
  assert.equal(typeof classifyParameters, 'object');
  const classifyBody = String(
    (classifyParameters as Record<string, unknown>)['jsonBody'] ?? ''
  );
  assert.match(
    classifyBody,
    /files:\s*\$json\.files/,
    `${fileName} classifier request must pass files: $json.files`
  );
  assert.match(
    classifyBody,
    /prNumber:\s*\$json\.prNumber/,
    `${fileName} classifier request must use normalized prNumber`
  );
  assert.match(
    classifyBody,
    /sha:\s*\$json\.sha/,
    `${fileName} classifier request must use normalized sha`
  );

  const buildRoutingNode = nodes.find((node) =>
    String(node.name ?? '').startsWith('Build Cherry')
  );
  assert.notEqual(buildRoutingNode, undefined, `${fileName} must build Cherry routing output`);
  const buildRoutingParameters = buildRoutingNode?.parameters;
  assert.notEqual(buildRoutingParameters, null);
  assert.equal(typeof buildRoutingParameters, 'object');
  const buildRoutingCode = String(
    (buildRoutingParameters as Record<string, unknown>)['jsCode'] ?? ''
  );
  assert.match(
    buildRoutingCode,
    /const sha = prEvent\.sha;/,
    `${fileName} must set sha from the normalized PR event before status posting`
  );
  assert.match(
    buildRoutingCode,
    /\n\s*sha,\n/,
    `${fileName} must carry sha as a direct routing output field`
  );

  const normalizeNode = nodeByName(nodes, 'Normalize Changed Files');
  const normalizePrNode = nodeByName(nodes, 'Normalize PR');
  const normalizePrParameters = normalizePrNode.parameters;
  assert.notEqual(normalizePrParameters, null);
  assert.equal(typeof normalizePrParameters, 'object');
  const normalizePrCode = String(
    (normalizePrParameters as Record<string, unknown>)['jsCode'] ?? ''
  );
  const webhookNormalized = normalizePr(normalizePrCode, {
    json: {
      pull_request: {
        number: 42,
        title: 'Webhook PR',
        body: 'Body',
        head: { sha: 'sha-webhook' },
        labels: [{ name: 'bug' }],
      },
      repository: { full_name: 'div0rce/cherry', name: 'cherry', owner: { login: 'div0rce' } },
    },
  });
  assert.equal(webhookNormalized['prNumber'], 42, `${fileName} must normalize webhook PR number`);
  assert.equal(webhookNormalized['sha'], 'sha-webhook', `${fileName} must normalize webhook PR sha`);
  const searchNormalized = normalizePr(normalizePrCode, {
    json: {
      items: [{ number: 43, title: 'Search PR', head: { sha: 'sha-search' } }],
      repo: 'div0rce/cherry',
    },
  });
  assert.equal(searchNormalized['prNumber'], 43, `${fileName} must normalize GitHub search PR number`);
  assert.equal(searchNormalized['sha'], 'sha-search', `${fileName} must normalize GitHub search PR sha`);
  const flatNormalized = normalizePr(normalizePrCode, {
    json: {
      pr_number: 44,
      sha: 'sha-flat',
      title: 'Flat PR',
      repo: 'div0rce/cherry',
    },
  });
  assert.equal(flatNormalized['prNumber'], 44, `${fileName} must normalize flat PR number`);
  assert.equal(flatNormalized['sha'], 'sha-flat', `${fileName} must normalize flat PR sha`);
  const emptySearchNormalized = normalizePr(normalizePrCode, {
    json: {
      items: [],
      total_count: 0,
      search_type: 'github_pull_request_search',
      repo: 'div0rce/cherry',
    },
  });
  assert.equal(
    emptySearchNormalized['error'],
    'missing_pr_number',
    `${fileName} must fail safely when GitHub search returns no PR items`
  );
  assert.equal(
    emptySearchNormalized['totalCount'],
    0,
    `${fileName} missing-pr response must preserve GitHub search total_count`
  );

  const normalizeParameters = normalizeNode.parameters;
  assert.notEqual(normalizeParameters, null);
  assert.equal(typeof normalizeParameters, 'object');
  const normalizeCode = String(
    (normalizeParameters as Record<string, unknown>)['jsCode'] ?? ''
  );
  assertPreservesReturnedFiles(`${fileName} array payload`, normalizeCode, [
    { json: [{ filename: 'lib/engine/solver.ts' }] },
  ]);
  assertPreservesReturnedFiles(`${fileName} json.files`, normalizeCode, [
    { json: { files: [{ filename: 'app/api/scan/route.ts' }] } },
  ]);
  assertPreservesReturnedFiles(`${fileName} json.data`, normalizeCode, [
    { json: { data: [{ filename: 'prisma/schema.prisma' }] } },
  ]);
  assertPreservesReturnedFiles(`${fileName} per-item object`, normalizeCode, [
    { json: { filename: 'docs/engine/update.md' } },
  ]);

  const statusNodes = nodes.filter((node) => String(node.name ?? '').startsWith('Post '));
  const statusBodies = statusNodes
    .map((node) => {
      const parameters = node.parameters;
      if (parameters === null || typeof parameters !== 'object') return '';
      return String((parameters as Record<string, unknown>)['jsonBody'] ?? '');
    })
    .join('\n');
  assert.match(
    statusBodies,
    /repo:\s*\$json\.repo/,
    `${fileName} status bodies must use direct Cherry repo`
  );
  assert.match(
    statusBodies,
    /sha:\s*\$json\.sha/,
    `${fileName} status bodies must use direct Cherry sha`
  );
  assert.match(
    statusBodies,
    /\$json\.statusRequest\.context/,
    `${fileName} status bodies must use direct Cherry statusRequest context`
  );
  assert.match(
    statusBodies,
    /\$json\.statusRequest\.state/,
    `${fileName} status bodies must use direct Cherry statusRequest state`
  );
  assert.match(
    statusBodies,
    /\$json\.statusRequest\.description/,
    `${fileName} status bodies must use direct Cherry statusRequest description`
  );
  assert.match(
    statusBodies,
    /\$json\.statusRequest\.targetUrl/,
    `${fileName} status bodies must use Cherry statusRequests`
  );
  assert.match(
    statusBodies,
    /\$json\.outputHash/,
    `${fileName} status bodies must use Cherry top-level outputHash`
  );
  assert.match(
    statusBodies,
    /sourceWorkflow:\s*\$json\.workflow/,
    `${fileName} status bodies must use direct workflow identity`
  );
  assert.match(
    statusBodies,
    /classifierVersion:\s*\$json\.cherryClassifierOutput\.classifierVersion/,
    `${fileName} status bodies must use direct Cherry classifier version`
  );
  for (const pattern of forbiddenStatusIdentityFallbackPatterns) {
    assert.equal(
      pattern.test(statusBodies),
      false,
      `${fileName} status bodies must not synthesize status identity with ${pattern}`
    );
  }
}

console.warn('automation workflows: ok');
