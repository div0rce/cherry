"use client";

import type { JSX } from "react";

export function AutopilotPurchaseForm(): JSX.Element {
  return (
    <article className="rounded-2xl border border-[#E2E8F0] bg-white p-5 space-y-4 shadow-sm">
      <div>
        <div className="text-sm font-semibold text-[#0F172A]">
          Upcoming purchase
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label
            className="text-xs font-medium text-[#0F172A]"
            htmlFor="autopilot-amount"
          >
            Amount
          </label>
          <div className="mt-1 flex items-center rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2">
            <span className="text-sm text-[#94A3B8]">$</span>
            <input
              id="autopilot-amount"
              type="number"
              step="0.01"
              placeholder="42.18"
              className="ml-2 w-full bg-transparent text-sm text-[#0F172A] focus-visible:outline-none"
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
            placeholder="Din Tai Fung"
            className="mt-1 w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-sm text-[#0F172A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C21733]/40"
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
            className="mt-1 w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-sm text-[#0F172A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C21733]/40"
            defaultValue="dining"
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
              className="rounded-full bg-white px-3 py-1 font-medium text-[#0F172A] shadow-sm"
            >
              Now
            </button>
            <button
              type="button"
              className="ml-1 rounded-full px-3 py-1 text-[#64748B]"
            >
              Scheduling soon
            </button>
          </div>
          <p className="text-[10px] text-[#94A3B8]">
            Scheduled charges and due dates will matter later.
          </p>
        </div>

        <p className="text-xs text-[#94A3B8]">
          Autopilot uses amount, merchant, and category to simulate your month.
        </p>
      </div>
    </article>
  );
}
