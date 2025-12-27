import type { JSX } from 'react';
import { PageHeader } from '../../../../../components/ui/page-header';
import { Panel } from '../../../../../components/ui/panel';
import { Card } from '../../../../../components/ui/card';
import { MetricCard } from '../../../../../components/ui/metric-card';
import { EmptyState } from '../../../../../components/ui/empty-state';

type Guardrail = {
  code: string;
  severity: 'HARD' | 'SOFT';
  description: string;
  category: string;
};

const GUARDRails: Guardrail[] = [
  {
    code: 'HARD:ESSENTIAL_BUCKET_OVER_LIMIT',
    severity: 'HARD',
    description: 'Essential bucket would be exceeded by this purchase.',
    category: 'Buckets',
  },
  {
    code: 'HARD:STRICT_BUCKET_OVER_LIMIT',
    severity: 'HARD',
    description: 'Strict bucket would be exceeded by this purchase.',
    category: 'Buckets',
  },
  {
    code: 'HARD:UTILIZATION_THRESHOLD_EXCEEDED',
    severity: 'HARD',
    description: 'Card utilization would exceed configured threshold.',
    category: 'Debt',
  },
  {
    code: 'HARD:PAYDOWN_EXCEEDS_LIQUID',
    severity: 'HARD',
    description: 'Planned paydown exceeds available liquid cash.',
    category: 'Liquidity',
  },
  {
    code: 'SOFT:ESSENTIAL_PURCHASE_DELAY',
    severity: 'SOFT',
    description: 'Essential purchase is being delayed; advisory only.',
    category: 'Buckets',
  },
];

export default function GuardrailMonitorPage(): JSX.Element {
  const hardCount = GUARDRails.filter((g) => g.severity === 'HARD').length;
  const softCount = GUARDRails.length - hardCount;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        label="Engine"
        badge="Dev / Guardrails"
        title="Guardrail monitor"
        description="Reference for hard/soft guardrails and a view into recent guardrail activity."
      />

      <section className="grid gap-3 md:grid-cols-3">
        <MetricCard label="Guardrails" value={GUARDRails.length} />
        <MetricCard label="Hard" value={hardCount} tone="negative" helper="Block unsafe actions" />
        <MetricCard label="Soft" value={softCount} helper="Advisory warnings" />
      </section>

      <Panel tone="muted" title="Guardrail catalog" description="Codes, severity, and descriptions.">
        <div className="grid gap-3 md:grid-cols-2">
          {GUARDRails.map((guardrail) => (
            <Card key={guardrail.code} tone="base" padding="md" className="border border-[rgba(27,38,69,0.6)]">
              <p className="text-sm font-semibold text-[#f8fafc]">{guardrail.code}</p>
              <p className="text-xs text-[#c3cce5]">
                Severity: {guardrail.severity} · Category: {guardrail.category}
              </p>
              <p className="mt-1 text-sm text-[#dbe4ff]">{guardrail.description}</p>
            </Card>
          ))}
        </div>
      </Panel>

      <Panel
        tone="muted"
        title="Recent guardrail occurrences"
        description="Recent guardrail events from engine activity (sampled)."
      >
        <EmptyState
          title="No guardrail events captured yet"
          description="Run scans/simulations to exercise guardrails; events will appear here when available."
        />
      </Panel>
    </div>
  );
}
