import type { JSX } from "react";
import { AutopilotPurchaseForm } from "./AutopilotPurchaseForm";
import { AutopilotDecisionPanel } from "./AutopilotDecisionPanel";

export function AutopilotShell(): JSX.Element {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
        {/* Page heading */}
        <header className="mb-8 md:mb-10">
          <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-[#94A3B8]">
            Cherry Autopilot
          </div>
          <h1 className="text-2xl font-semibold text-[#0F172A] md:text-3xl">
            See how Autopilot would handle this purchase.
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[#475569]">
            Adjust the details on the left. Autopilot simulates your month,
            picks a card, and shows the impact on your buckets before you
            commit.
          </p>
        </header>

        {/* Two-column main layout */}
        <main className="grid gap-6 md:grid-cols-[1.25fr_1.75fr]">
          <section>
            <AutopilotPurchaseForm />
            {/* TODO: recent activity list */}
          </section>
          <section>
            <AutopilotDecisionPanel />
          </section>
        </main>
      </div>
    </div>
  );
}
