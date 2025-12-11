import type { JSX } from "react";
import { Button } from "@/components/ui/Button";

type CardChoice = {
  id: string;
  name: string;
  sentence: string;
  label: "Best overall" | "Keeps month similar" | "Avoid this";
  labelTone: "positive" | "neutral" | "negative";
};

type MonthImpact = {
  extraCash: number;
  feesAvoided: number;
  riskNote: string;
};

const cardChoices: CardChoice[] = [
  {
    id: "sapphire",
    name: "Sapphire Preferred",
    sentence: "Earns the most rewards and keeps Dining at 78% of your budget.",
    label: "Best overall",
    labelTone: "positive",
  },
  {
    id: "freedom",
    name: "Freedom Unlimited",
    sentence: "Fewer rewards and brings Dining to 82% of your budget.",
    label: "Keeps month similar",
    labelTone: "neutral",
  },
  {
    id: "apple",
    name: "Apple Card",
    sentence:
      "Costs about $3 more in interest and pushes this budget over its limit.",
    label: "Avoid this",
    labelTone: "negative",
  },
];

const monthImpact: MonthImpact = {
  extraCash: 118,
  feesAvoided: 3,
  riskNote:
    "Dining and Lifestyle stay under their limits; Travel is unchanged.",
};

const labelToneClass: Record<CardChoice["labelTone"], string> = {
  positive: "bg-[#DCFCE7] text-[#166534]",
  neutral: "bg-[#E5E7EB] text-[#4B5563]",
  negative: "bg-[#FEE2E2] text-[#991B1B]",
};

const labelToneText: Record<CardChoice["labelTone"], string> = {
  positive: "text-[#16A34A]",
  neutral: "text-[#94A3B8]",
  negative: "text-[#DC2626]",
};

export function AutopilotDecisionPanel(): JSX.Element {
  const hasPurchase = false;
  const state: "empty" | "recommended" | "warning" = "recommended";

  if (!hasPurchase) {
    return (
      <div className="space-y-2 rounded-2xl border border-[#E2E8F0] bg-white/90 p-6 text-sm text-[#475569] shadow-sm">
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

  if (state === "empty") {
    return (
      <div className="rounded-2xl border border-[#E2E8F0] bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
        <div className="text-[11px] uppercase tracking-[0.18em] text-[#94A3B8]">
          Autopilot is idle
        </div>
        <p className="mt-2 text-sm text-[#475569]">
          Fill in an amount and merchant on the left. We’ll show you which card
          to use and how it changes your month.
        </p>
      </div>
    );
  }

  const recommendedChoice = cardChoices[0];
  const otherChoices = cardChoices.slice(1);

  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] space-y-6">
      {state === "warning" && (
        <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-[11px] text-[#991B1B]">
          Every card pushes at least one budget over its limit. Consider
          lowering this purchase or adjusting buckets.
        </div>
      )}

      <div className="space-y-1">
        <div className="text-[11px] uppercase tracking-[0.18em] text-[#94A3B8]">
          Autopilot recommendation
        </div>
        <p className="text-sm text-[#475569]">
          Optimized from your real buckets and cards.
        </p>
      </div>

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
          </div>
          <div
            className={`self-start rounded-full px-2 py-1 text-[10px] font-semibold text-right ${labelToneClass[recommendedChoice.labelTone]}`}
          >
            {recommendedChoice.label}
          </div>
        </div>
      </div>

      <div className="my-3 h-px bg-[#E2E8F0]" />

      <div className="space-y-3">
        <div className="text-xs font-semibold text-[#0F172A]">
          Other ways to pay
        </div>
        <div className="space-y-3">
          {otherChoices.map((choice) => (
            <div
              key={choice.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 rounded-xl px-3 py-2.5"
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

      <div className="space-y-2 border-t border-[#E2E8F0] pt-4">
        <div className="text-[11px] uppercase tracking-[0.16em] text-[#94A3B8]">
          Month impact with this card
        </div>
        <div className="text-sm text-[#0F172A]">
          You finish the month with{" "}
          <span className="font-semibold">${monthImpact.extraCash} more</span>{" "}
          and{" "}
          <span className="font-semibold">
            avoid {monthImpact.feesAvoided} fees
          </span>
          .
        </div>
        <div className="mt-1 space-y-1.5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E2E8F0]">
            <div className="flex h-full">
              <div className="flex-1 bg-[#BBF7D0]" />
              <div className="flex-[0.6] bg-[#FED7E2]" />
              <div className="flex-[0.4] bg-[#E5E7EB]" />
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px] text-[#94A3B8]">
            <span>Essentials · 62% remaining</span>
            <span>Lifestyle · 34% remaining</span>
            <span>Other · stable</span>
          </div>
        </div>
        <p className="text-[11px] text-[#94A3B8]">{monthImpact.riskNote}</p>
      </div>

      <div className="flex flex-col gap-3 pt-2 md:flex-row">
        <Button className="w-full md:w-auto">Use this card</Button>
        <Button variant="secondary" className="w-full md:w-auto">
          View full simulation
        </Button>
      </div>
    </div>
  );
}
