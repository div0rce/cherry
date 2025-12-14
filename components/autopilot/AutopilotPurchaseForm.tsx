"use client";

import type { JSX } from "react";
import type { Category, Timing } from "./AutopilotShell";

type AutopilotPurchaseFormProps = {
  amount: number | null;
  merchant: string;
  category: Category;
  timing: Timing;
  canSimulate: boolean;
  isSimulating: boolean;
  onAmountChange: (value: number | null) => void;
  onMerchantChange: (value: string) => void;
  onCategoryChange: (value: Category) => void;
  onTimingChange: (value: Timing) => void;
  onSimulate: () => void;
};

export function AutopilotPurchaseForm({
  amount,
  merchant,
  category,
  timing,
  canSimulate,
  isSimulating,
  onAmountChange,
  onMerchantChange,
  onCategoryChange,
  onTimingChange,
  onSimulate,
}: AutopilotPurchaseFormProps): JSX.Element {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (canSimulate && !isSimulating) {
      onSimulate();
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <article className="rounded-2xl border border-[#E2E8F0] bg-white/95 p-5 shadow-sm backdrop-blur">
        <div className="space-y-1">
          <div className="text-sm font-semibold text-[#0F172A]">
            Upcoming purchase
          </div>
          <p className="text-xs text-[#64748B]">
            We never charge your cards from here. This is a live sandbox to plan
            the swipe before it happens.
          </p>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <label
              className="text-xs font-medium text-[#0F172A]"
              htmlFor="autopilot-amount"
            >
              Amount
            </label>
            <div className="mt-1 flex items-center rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 focus-within:border-[#C21733] focus-within:ring-2 focus-within:ring-[#C21733]/30">
              <span className="text-sm text-[#94A3B8]">$</span>
              <input
                id="autopilot-amount"
                type="number"
                min="0"
                step="0.01"
                value={amount ?? ""}
                onChange={(e) =>
                  onAmountChange(
                    e.target.value !== "" ? Number(e.target.value) : null
                  )
                }
                placeholder="42.18"
                className="ml-2 w-full bg-transparent text-sm text-[#0F172A] placeholder:text-[#CBD5E1] focus-visible:outline-none"
              />
            </div>
          </div>

          <div>
            <label
              className="text-xs font-medium text-[#0F172A]"
              htmlFor="autopilot-merchant"
            >
              Merchant
            </label>
            <input
              id="autopilot-merchant"
              type="text"
              value={merchant}
              onChange={(e) => onMerchantChange(e.target.value)}
              placeholder="Din Tai Fung"
              className="mt-1 w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-sm text-[#0F172A] placeholder:text-[#CBD5E1] focus-visible:outline-none focus-visible:border-[#C21733] focus-visible:ring-2 focus-visible:ring-[#C21733]/30"
            />
          </div>

          <div>
            <label
              className="text-xs font-medium text-[#0F172A]"
              htmlFor="autopilot-category"
            >
              Category
            </label>
            <select
              id="autopilot-category"
              value={category}
              onChange={(e) => onCategoryChange(e.target.value as Category)}
              className="mt-1 w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-sm text-[#0F172A] focus-visible:outline-none focus-visible:border-[#C21733] focus-visible:ring-2 focus-visible:ring-[#C21733]/30"
            >
              <option value="dining">Dining</option>
              <option value="groceries">Groceries</option>
              <option value="travel">Travel</option>
              <option value="gas">Gas</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-[#0F172A]">Time</label>
            <div className="inline-flex items-center rounded-full bg-[#F8FAFC] p-1 text-[11px]">
              <button
                type="button"
                onClick={() => onTimingChange("now")}
                className={`rounded-full px-3 py-1 font-medium transition-all ${
                  timing === "now"
                    ? "bg-white text-[#0F172A] shadow-sm"
                    : "text-[#64748B]"
                }`}
              >
                Now
              </button>
              <button
                type="button"
                onClick={() => onTimingChange("scheduled-soon")}
                className={`ml-1 rounded-full px-3 py-1 transition-all ${
                  timing === "scheduled-soon"
                    ? "bg-white text-[#0F172A] shadow-sm font-medium"
                    : "text-[#64748B]"
                }`}
              >
                Scheduling soon
              </button>
            </div>
            <p className="text-[10px] text-[#94A3B8]">
              Scheduled charges and due dates will matter later.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={!canSimulate || isSimulating}
              className={`inline-flex w-full items-center justify-center rounded-xl bg-[#C21733] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors ${
                isSimulating
                  ? "opacity-90 tracking-tight"
                  : "hover:bg-[#A01029] disabled:opacity-60 disabled:hover:bg-[#C21733]"
              } disabled:cursor-not-allowed`}
            >
              {isSimulating
                ? "Running Autopilot..."
                : "Simulate with Autopilot"}
            </button>
          </div>

          <p className="text-xs text-[#94A3B8]">
            Autopilot uses amount, merchant, and category to simulate your month
            before you commit in your banking app.
          </p>
        </div>
      </article>
    </form>
  );
}
