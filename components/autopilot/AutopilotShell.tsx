"use client";

import { useState } from 'react';
import type { JSX } from 'react';
import {
  runSimulation,
  type AutopilotSimulationResult,
} from '@/lib/autopilot/runSimulation';
import type {
  AutopilotUiSpec,
  AutopilotCategoryOptionValue,
  AutopilotTimingOption,
} from '@/lib/autopilot/uiSpec';
import { AutopilotPurchaseForm } from './AutopilotPurchaseForm';
import { AutopilotDecisionPanel } from './AutopilotDecisionPanel';

export type AutopilotPurchaseSummary = {
  amount: number;
  merchant: string;
  category: Category;
  timing: Timing;
};

type Category = AutopilotCategoryOptionValue;
type Timing = AutopilotTimingOption;
export type { Category, Timing };

function invariant(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

export function AutopilotShell({ uiSpec }: { uiSpec: AutopilotUiSpec }): JSX.Element {
  invariant(uiSpec.form.categoryOptions.length > 0, 'Autopilot UI spec missing category options');
  invariant(uiSpec.form.timingOptions.length > 0, 'Autopilot UI spec missing timing options');

  const categoryOption = uiSpec.form.categoryOptions[0];
  const timingOption = uiSpec.form.timingOptions[0];
  invariant(categoryOption !== undefined, 'Autopilot UI spec missing first category option');
  invariant(timingOption !== undefined, 'Autopilot UI spec missing first timing option');
  const defaultCategory = categoryOption.value as Category;
  const defaultTiming = timingOption.value as Timing;
  const [amount, setAmount] = useState<number | null>(null);
  const [merchant, setMerchant] = useState("");
  const [category, setCategory] = useState<Category>(defaultCategory);
  const [timing, setTiming] = useState<Timing>(defaultTiming);
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
      console.error('Autopilot simulation failed', error);
      setSimulationError(uiSpec.simulationErrorMessage);
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
            {uiSpec.eyebrow}
          </div>
          <h1 className="text-2xl font-semibold text-[#0F172A] md:text-3xl">
            {uiSpec.headline}
          </h1>
          {uiSpec.subhead !== '' && (
            <p className="mt-2 max-w-2xl text-sm text-[#475569]">
              {uiSpec.subhead}
            </p>
          )}
        </header>

        {/* Two-column main layout */}
        <main className="grid gap-6 md:grid-cols-[1.15fr_1.5fr]">
          <section className="md:sticky md:top-6">
            <AutopilotPurchaseForm
              uiSpec={uiSpec}
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
              uiSpec={uiSpec}
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
