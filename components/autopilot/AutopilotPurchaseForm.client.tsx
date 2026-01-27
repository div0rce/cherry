"use client";

import React, { type JSX } from 'react';
import { getAutopilotUiSpec } from '../../lib/autopilot/uiSpec.js';
import type { Category, Timing } from './AutopilotShell.js';

void React;

type AutopilotUiSpec = ReturnType<typeof getAutopilotUiSpec>;

type AutopilotPurchaseFormProps = {
  uiSpec: AutopilotUiSpec;
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
  uiSpec,
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
  const spec: AutopilotUiSpec = uiSpec;
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (canSimulate && !isSimulating) {
      onSimulate();
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="space-y-1">
          <div className="text-sm font-semibold text-[#0F172A]">{spec.form.formTitle}</div>
          <p className="text-sm text-[#475569]">{spec.form.helperText}</p>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <label
              className="text-xs font-medium text-[#0F172A]"
              htmlFor="autopilot-amount"
            >
              {spec.form.amountLabel}
            </label>
            <div className="mt-1 flex items-center rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 focus-within:border-[#C21733] focus-within:ring-2 focus-within:ring-[#C21733]/30">
              <span className="text-sm text-[#94A3B8]">$</span>
              <input
                id="autopilot-amount"
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                value={amount ?? ""}
                onChange={(e) =>
                  onAmountChange(
                    e.target.value !== "" ? Number(e.target.value) : null
                  )
                }
                placeholder={spec.form.amountPlaceholder}
                required
                className="ml-2 w-full bg-transparent text-sm text-[#0F172A] placeholder:text-[#CBD5E1] focus-visible:outline-none"
              />
            </div>
          </div>

          <div>
            <label
              className="text-xs font-medium text-[#0F172A]"
              htmlFor="autopilot-merchant"
            >
              {spec.form.merchantLabel}
            </label>
            <input
              id="autopilot-merchant"
              type="text"
              value={merchant}
              onChange={(e) => onMerchantChange(e.target.value)}
              placeholder={spec.form.merchantPlaceholder}
              required
              className="mt-1 w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-sm text-[#0F172A] placeholder:text-[#CBD5E1] focus-visible:outline-none focus-visible:border-[#C21733] focus-visible:ring-2 focus-visible:ring-[#C21733]/30"
            />
          </div>

          <div>
            <label
              className="text-xs font-medium text-[#0F172A]"
              htmlFor="autopilot-category"
            >
              {spec.form.categoryLabel}
            </label>
            <select
              id="autopilot-category"
              value={category}
              onChange={(e) => onCategoryChange(e.target.value as Category)}
              className="mt-1 w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-sm text-[#0F172A] focus-visible:outline-none focus-visible:border-[#C21733] focus-visible:ring-2 focus-visible:ring-[#C21733]/30"
            >
              {spec.form.categoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-[#0F172A]">
              {spec.form.timingLabel}
            </label>
            <div className="inline-flex items-center rounded-full bg-[#F8FAFC] p-1 text-[11px]">
              {spec.form.timingOptions.map((option, index) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onTimingChange(option.value as Timing)}
                  className={`rounded-full px-3 py-1 font-medium transition-all ${
                    timing === option.value
                      ? 'bg-white text-[#0F172A] shadow-sm'
                      : 'text-[#64748B]'
                  } ${index > 0 ? 'ml-1' : ''}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {(() => {
              const helperText = spec.form.timingOptions.find((option) => option.value === timing)?.helper;
              if (typeof helperText !== 'string' || helperText.trim() === '') {
                return null;
              }
              return <p className="text-[10px] text-[#94A3B8]">{helperText}</p>;
            })()}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={!canSimulate || isSimulating}
              className={`inline-flex w-full items-center justify-center rounded-xl bg-[#C21733] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors ${
                isSimulating
                  ? 'opacity-90 tracking-tight'
                  : 'hover:bg-[#A01029] disabled:opacity-60 disabled:hover:bg-[#C21733]'
              } disabled:cursor-not-allowed`}
            >
              {isSimulating ? spec.form.submitLoadingLabel : spec.form.submitLabel}
            </button>
          </div>

          <p className="text-xs text-[#64748B]">{spec.form.disclaimer}</p>
        </div>
      </article>
    </form>
  );
}
