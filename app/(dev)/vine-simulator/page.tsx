import type { JSX } from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PageHeader } from '@/components/ui/page-header';
import { Panel } from '@/components/ui/panel';
import { VineSimulatorClient } from './client';
export default async function VineSimulatorPage(): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect(`/signin?callbackUrl=${encodeURIComponent('/vine-simulator')}`);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader
        label="Hardware"
        badge="Dev / Lab Tool"
        title="Vine simulator"
        description="Simulate POS events and inspect engine behavior at the counter without BLE/NFC hardware."
      />

      <Panel
        tone="muted"
        title="Overview"
        description="Send order context (merchant + amount + MCC) into POST /api/vine/order and watch how the engine reacts."
      >
        <p className="text-sm text-[#c3cce5]">
          This page simulates <span className="font-semibold text-[#ffe6ee]">Cherry Vine hardware</span>.
          It exists to test the Observe → Evaluate → Recommend pipeline before any physical Cherry Vine device or firmware is built.
        </p>
        <p className="text-sm text-[#a5b0d0]">
          Cherry Vine is a context beacon (merchant + amount + timestamp over BLE/NFC). It never accepts taps or card data. The simulator mirrors that contract.
        </p>
      </Panel>

      <Panel
        tone="muted"
        title="Simulator"
        description="Craft a Vine payload and send it to the backend. Use Sessions to see the resulting advisory session."
      >
        <VineSimulatorClient />
      </Panel>

      <Panel
        tone="muted"
        title="How this differs from real Cherry Vine"
        description="Simulator shortcuts and what hardware will eventually handle."
      >
        <ul className="list-disc space-y-1 pl-4 text-sm text-[#c3cce5]">
          <li>Real Cherry Vine receives order totals from a POS or middleware.</li>
          <li>This simulator fakes that data by letting you type it manually.</li>
          <li>Real Vine broadcasts via BLE/NFC to iPhones.</li>
          <li>This simulator skips BLE/NFC and calls the backend directly.</li>
          <li>Real Vine does <strong>not</strong> verify card usage. Neither does this simulator.</li>
        </ul>
      </Panel>

      <Panel
        tone="muted"
        title='Why claims show "Pending verification"'
        description="The Vine Simulator only reproduces Observe; verification still happens elsewhere."
      >
        <p className="text-xs text-[#a5b0d0]">
          The Vine Simulator only reproduces the <strong>Observe</strong> step (merchant + amount context). It does <strong>not</strong> simulate payment, receipt verification, or bank imports.
        </p>
        <p className="text-xs text-[#a5b0d0]">
          After submitting a claim, Cherry still needs verification (receipt, email, bank sync). Until then, the CherryPoints ledger stays <code>PENDING</code>.
        </p>
        <div className="text-xs text-[#a5b0d0] leading-relaxed">
          <p className="mb-1 font-semibold text-[#c3cce5]">Simulator Flow:</p>
          <pre className="whitespace-pre-wrap text-[#a5b0d0]">
VineSim → POST /api/vine/order → RecommendationSession{'\n'}↓{'\n'}User claims (manual){'\n'}↓{'\n'}CherryPointLedger = PENDING (until verified)
          </pre>
        </div>
        <p className="text-xs text-[#a5b0d0]">
          Note: This page will <strong>never</strong> appear in production. It is for developers building Cherry Vine integrations and testing the backend flow without hardware.
        </p>
      </Panel>
    </div>
  );
}
