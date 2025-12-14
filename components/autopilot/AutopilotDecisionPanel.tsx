import type { JSX } from "react";
import { Button } from "@/components/ui/Button";
import { AutopilotMonthImpactBar } from "./AutopilotMonthImpactBar";
import type { AutopilotPurchaseSummary } from "./AutopilotShell";
import type {
  AutopilotSimulationResult,
  SimulationCardChoice,
} from "@/lib/autopilot/runSimulation";
import { formatCurrency } from "@/lib/formatCurrency";

type AutopilotDecisionPanelProps = {
  hasPurchase: boolean;
  purchaseSummary: AutopilotPurchaseSummary | null;
  simulationResult: AutopilotSimulationResult | null;
  isSimulating: boolean;
  simulationError: string | null;
};

const labelToneClass: Record<SimulationCardChoice["labelTone"], string> = {
  positive: "bg-[#DCFCE7] text-[#166534]",
  neutral: "bg-[#E5E7EB] text-[#4B5563]",
  negative: "bg-[#FEE2E2] text-[#991B1B]",
};

const labelToneText: Record<SimulationCardChoice["labelTone"], string> = {
  positive: "text-[#16A34A]",
  neutral: "text-[#94A3B8]",
  negative: "text-[#DC2626]",
};

const hasText = (value?: string | null): value is string =>
  value !== undefined && value !== null && value.trim() !== "";

export function AutopilotDecisionPanel({
  hasPurchase,
  purchaseSummary,
  simulationResult,
  isSimulating,
  simulationError,
}: AutopilotDecisionPanelProps): JSX.Element {
  const state = simulationResult?.state ?? "recommended";

  if (!hasPurchase || !purchaseSummary) {
    return (
      <div className="space-y-2 rounded-2xl border border-[#E2E8F0] bg-white/90 p-6 text-sm text-[#475569] shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="text-[11px] uppercase tracking-[0.18em] text-[#94A3B8]">
          Autopilot is idle
        </div>
        <p>
          Fill in an amount and merchant on the left. Autopilot will show the
          best card and the full impact on your month.
        </p>
      </div>
    );
  }

  if (!simulationResult) {
    return (
      <div className="space-y-4 rounded-2xl border border-[#E2E8F0] bg-white/95 p-6 text-sm text-[#475569] shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="text-[11px] uppercase tracking-[0.18em] text-[#94A3B8]">
          Preparing simulation
        </div>
        {isSimulating ? (
          <div className="space-y-4">
            <div className="text-sm text-[#94A3B8]">
              Autopilot is analyzing this purchase...
            </div>
            <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-4">
              <div className="h-3 w-3/4 animate-pulse rounded bg-[#E2E8F0] [animation-duration:1.1s]" />
              <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-[#E2E8F0] [animation-duration:1.1s]" />
              <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-[#E2E8F0] [animation-duration:1.1s]" />
              <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-[#E2E8F0] [animation-duration:1.1s]" />
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-[#991B1B]">
            {simulationError ??
              "Simulation output is unavailable right now. Please try again in a moment."}
          </div>
        )}
      </div>
    );
  }

  const { merchant, amount } = purchaseSummary;
  const recommendedChoice = simulationResult.cards[0] ?? null;
  const otherChoices = simulationResult.cards.slice(1);
  const segments = simulationResult.impactSegments;
  const impactNotes = simulationResult.impactNotes;
  const rewardStrength = simulationResult.rewardStrength;
  const hasBanner = hasText(simulationResult.riskBanner);
  const hasSimulationResult = simulationResult !== null;
  const errorTimestamp =
    simulationResult.errorTimestamp !== undefined &&
    simulationResult.errorTimestamp !== null &&
    simulationResult.errorTimestamp !== ""
      ? simulationResult.errorTimestamp
      : "Just now";

  return (
    <div className="space-y-6 rounded-2xl border border-[#E2E8F0] bg-white/95 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur">
      {state === "warning" && hasBanner && (
        <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-[11px] text-[#991B1B]">
          {simulationResult.riskBanner}
        </div>
      )}

      <div className="space-y-3 border-b border-[#E2E8F0] pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="text-[11px] uppercase tracking-[0.18em] text-[#94A3B8]">
              This simulation
            </div>
            <div className="text-base font-semibold text-[#0F172A]">
              {merchant !== "" ? merchant : "Unnamed merchant"}
            </div>
            <div className="text-[12px] text-[#64748B]">
              {formatCurrency(amount)} · {simulationResult.categoryLabel} ·{" "}
              {simulationResult.timingLabel}
            </div>
          </div>
          <div
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-medium ${simulationResult.safetyBadgeClass}`}
          >
            <span
              className={simulationResult.safetyBadgeDotClass}
              aria-hidden
            />
            {simulationResult.safetyBadgeLabel}
          </div>
        </div>
      </div>

      {isSimulating && (
        <div className="space-y-4">
          <div className="text-sm text-[#94A3B8]">
            Autopilot is analyzing this purchase...
          </div>
          <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-4">
            <div className="h-3 w-3/4 animate-pulse rounded bg-[#E2E8F0] [animation-duration:1.1s]" />
            <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-[#E2E8F0] [animation-duration:1.1s]" />
            <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-[#E2E8F0] [animation-duration:1.1s]" />
            <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-[#E2E8F0] [animation-duration:1.1s]" />
          </div>
          <div className="space-y-2">
            <div className="h-px w-full animate-pulse bg-[#E2E8F0] [animation-duration:1.1s]" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-[#E2E8F0] [animation-duration:1.1s]" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-[#E2E8F0] [animation-duration:1.1s]" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-[#E2E8F0] [animation-duration:1.1s]" />
          </div>
        </div>
      )}

      {!isSimulating && simulationError !== null && simulationError !== "" && (
        <>
          <div className="h-px bg-[#FECACA]" />
          <div className="flex items-start justify-between transition-opacity duration-200">
            <div className="space-y-2 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-sm text-[#991B1B]">
              <div className="text-[11px] uppercase tracking-[0.14em]">
                Simulation issue
              </div>
              <p>{simulationError}</p>
              {hasSimulationResult && (
                <p className="text-[11px] text-[#991B1B]">
                  Showing your last successful simulation.
                </p>
              )}
            </div>
            <span className="text-[10px] text-[#991B1B]">{errorTimestamp}</span>
          </div>
        </>
      )}

      {!isSimulating && hasSimulationResult && (
        <div
          className={
            simulationError !== null && simulationError !== ""
              ? "opacity-70 space-y-6"
              : "space-y-6"
          }
        >
          <div className="space-y-2">
            <div className="text-[11px] uppercase tracking-[0.18em] text-[#94A3B8]">
              {simulationResult.recommendationSectionLabel}
            </div>
            <p className="text-sm text-[#475569]">
              {simulationResult.recommendationSummary}
            </p>
          </div>

          {recommendedChoice !== null && (
            <div className="relative rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-4 transition-all duration-200 ease-out">
              <div className="absolute left-0 right-0 top-0 h-[2px] rounded-t-xl bg-gradient-to-r from-[#C21733] to-[#FF4D6D]" />
              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3">
                <div>
                  <div className="text-xs font-medium text-[#0F172A]">
                    {recommendedChoice.name}
                  </div>
                  <div className="mt-0.5 text-[11px] text-[#64748B]">
                    {recommendedChoice.sentence}
                  </div>
                  <div className="mt-2 flex items-center gap-1">
                    {Array.from({ length: 4 }).map((_, idx) => {
                      const isActive = idx < rewardStrength;
                      return (
                        <span
                          key={idx}
                          className={`h-1.5 w-1.5 rounded-full ${
                            isActive ? "bg-[#C21733]" : "bg-[#E2E8F0]"
                          }`}
                        />
                      );
                    })}
                    <span className="text-[10px] text-[#94A3B8]">
                      {simulationResult.rewardStrengthLabel}
                    </span>
                  </div>
                </div>
                <div
                  className={`self-start rounded-full px-2 py-1 text-[10px] font-semibold text-right ${labelToneClass[recommendedChoice.labelTone]}`}
                >
                  {recommendedChoice.label}
                </div>
              </div>
            </div>
          )}

          <div className="my-3 h-px bg-[#E2E8F0]" />

          <div className="space-y-3">
            <div className="text-xs font-semibold text-[#0F172A]">
              {simulationResult.alternativeSectionLabel}
            </div>
            <div className="space-y-3">
              {otherChoices.map((choice) => (
                <div
                  key={choice.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 rounded-xl px-3 py-2.5 transition hover:bg-[#F8FAFC]"
                >
                  <div>
                    <div className="text-xs font-medium text-[#0F172A]">
                      {choice.name}
                    </div>
                  <div className="mt-0.5 text-[11px] text-[#64748B]">
                    {choice.sentence}
                  </div>
                </div>
                <div
                  className={`self-start text-right text-[11px] font-semibold ${labelToneText[choice.labelTone]}`}
                  >
                    {choice.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3 border-t border-[#E2E8F0] pt-4">
            <div className="text-[11px] uppercase tracking-[0.16em] text-[#94A3B8]">
              {simulationResult.monthImpactTitle}
            </div>
            <div className="text-sm text-[#0F172A]">
              {simulationResult.monthImpactSummary}
            </div>
            <AutopilotMonthImpactBar segments={segments} />
            {impactNotes.length > 0 ? (
              <div className="space-y-1">
                {impactNotes.map((note) => (
                  <p key={note} className="text-[11px] text-[#94A3B8]">
                    {note}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-[#94A3B8]">
                {simulationResult.monthImpact.riskNote}
              </p>
            )}
          </div>
        </div>
      )}

      {hasSimulationResult && (
        <>
          <div className="flex flex-col gap-3 pt-2 md:flex-row">
            <Button type="button" className="w-full md:w-auto">
              {simulationResult.ctaPrimary}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="w-full md:w-auto"
            >
              {simulationResult.ctaSecondary}
            </Button>
          </div>
          <p className="text-[11px] text-[#94A3B8]">
            Actions coming soon — this is a planning sandbox.
          </p>
        </>
      )}
    </div>
  );
}
