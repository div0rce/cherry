import type { JSX } from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { VineSimulatorClient } from './client';
export default async function VineSimulatorPage(): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect(`/signin?callbackUrl=${encodeURIComponent('/vine-simulator')}`);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-white/10 bg-slate-900/40 p-4 space-y-2">
        <h2 className="text-lg font-semibold text-white">Cherry Vine Simulator (Developer Tool)</h2>
        <p className="text-sm text-slate-300">
          This page simulates <span className="font-semibold text-pink-300">Cherry Vine hardware</span>.
          It lets developers send fake <em>order context</em> (merchant + amount + MCC) into{' '}
          <code className="text-pink-200">POST /api/vine/order</code> without BLE, NFC, or POS integration.
        </p>
        <p className="text-sm text-slate-400">
          It exists to test the Observe → Evaluate → Recommend pipeline before any physical Cherry Vine device or firmware is built.
        </p>
      </div>

      <VineSimulatorClient />

      <div className="rounded-xl border border-white/10 bg-black/30 p-4 space-y-2">
        <h3 className="text-sm font-semibold text-white tracking-wide uppercase">
          How This Differs From Real Cherry Vine
        </h3>
        <ul className="list-disc space-y-1 pl-4 text-sm text-slate-300">
          <li>Real Cherry Vine receives order totals from a POS or middleware.</li>
          <li>This simulator fakes that data by letting you type it manually.</li>
          <li>Real Vine broadcasts via BLE/NFC to iPhones.</li>
          <li>This simulator skips BLE/NFC and calls the backend directly.</li>
          <li>Real Vine does <strong>not</strong> verify card usage. Neither does this simulator.</li>
        </ul>
      </div>

      <div className="rounded-xl border border-white/10 bg-slate-900/40 p-3 space-y-1">
        <h3 className="text-sm font-semibold text-white">Why Claims Show “Pending Verification”</h3>
        <p className="text-xs text-slate-400">
          The Vine Simulator only reproduces the <strong>Observe</strong> step (merchant + amount context). It does <strong>not</strong> simulate payment, receipt verification, or bank imports.
        </p>
        <p className="text-xs text-slate-400">
          After submitting a claim, Cherry still needs verification (receipt, email, bank sync). Until then, the CherryPoints ledger stays <code>PENDING</code>.
        </p>
      </div>

      <div className="text-xs text-slate-500 leading-relaxed">
        <p className="mb-1 font-semibold text-slate-300">Simulator Flow:</p>
        <pre className="whitespace-pre-wrap text-slate-400">
VineSim → POST /api/vine/order → RecommendationSession{'\n'}↓{'\n'}User claims (manual){'\n'}↓{'\n'}CherryPointLedger = PENDING (until verified)
        </pre>
      </div>

      <p className="text-xs text-slate-500">
        Note: This page will <strong>never</strong> appear in production. It is for developers building Cherry Vine integrations and testing the backend flow without hardware.
      </p>
    </div>
  );
}
