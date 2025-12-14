"use client";

import { useState } from "react";
import type { JSX } from "react";
import {
  runSimulation,
  type AutopilotSimulationResult,
} from "@/lib/autopilot/runSimulation";
import { AutopilotPurchaseForm } from "./AutopilotPurchaseForm";
import { AutopilotDecisionPanel } from "./AutopilotDecisionPanel";

export type Category = "dining" | "groceries" | "travel" | "gas" | "other";
export type Timing = "now" | "scheduled-soon";

export type AutopilotPurchaseSummary = {
  amount: number;
  merchant: string;
  category: Category;
  timing: Timing;
};

export function AutopilotShell(): JSX.Element {
  const [amount, setAmount] = useState<number | null>(null);
  const [merchant, setMerchant] = useState("");
  const [category, setCategory] = useState<Category>("dining");
  const [timing, setTiming] = useState<Timing>("now");
  const [hasPurchase, setHasPurchase] = useState(false);
  const [purchaseSummary, setPurchaseSummary] =
    useState<AutopilotPurchaseSummary | null>(null);
  const [simulationResult, setSimulationResult] =
    useState<AutopilotSimulationResult | null>(null);
  const [simulationError, setSimulationError] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const hasAmount = typeof amount === "number" && Number.isFinite(amount) && amount > 0;
  const hasMerchant = merchant.trim().length > 0;
  const canSimulate = hasAmount && hasMerchant;

  const handleSimulate = async (): Promise<void> => {
    if (!canSimulate || amount === null || !Number.isFinite(amount)) return;
    const summary: AutopilotPurchaseSummary = {
      amount,
      merchant: merchant.trim(),
      category,
      timing,
    };
    setIsSimulating(true);
    setSimulationError(null);
    setPurchaseSummary(summary);
    setHasPurchase(true);
    try {
      const result = await runSimulation(summary);
      setSimulationResult(result);
    } catch (error) {
      console.error("Autopilot simulation failed", error);
      setSimulationError(
        "Autopilot couldn’t simulate this purchase. Your buckets and cards are safe; try again in a moment. If it persists, try a smaller amount.",
      );
      setSimulationResult(null);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F9FAFB] to-[#E2E8F0]">
      <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
        {/* Page heading */}
        <header className="mb-8 md:mb-10">
          <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-[#94A3B8]">
            Cherry Autopilot
          </div>
          <h1 className="text-2xl font-semibold text-[#0F172A] md:text-3xl">
            See how Autopilot would handle this purchase.
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[#475569]">
            Describe the spend, Autopilot simulates your month, chooses the
            card, and shows bucket impact before you tap pay.
          </p>
        </header>

        {/* Two-column main layout */}
        <main className="grid gap-6 md:grid-cols-[1.15fr_1.5fr]">
          <section className="md:sticky md:top-6">
            <AutopilotPurchaseForm
              amount={amount}
              merchant={merchant}
              category={category}
              timing={timing}
              canSimulate={canSimulate}
              isSimulating={isSimulating}
              onAmountChange={setAmount}
              onMerchantChange={setMerchant}
              onCategoryChange={setCategory}
              onTimingChange={setTiming}
              onSimulate={handleSimulate}
            />
          </section>
          <section>
            <AutopilotDecisionPanel
              hasPurchase={hasPurchase}
              purchaseSummary={purchaseSummary}
              simulationResult={simulationResult}
              isSimulating={isSimulating}
              simulationError={simulationError}
            />
          </section>
        </main>
      </div>
    </div>
  );
}
