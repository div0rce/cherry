import type { JSX } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { cn } from "@/lib/ui/cn";

export default function HelloCherryPage(): JSX.Element {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="mx-auto max-w-4xl px-4 pt-32 pb-24 md:pt-40 md:pb-28">
        {/* Overline label */}
        <div className="mb-4 text-[11px] uppercase tracking-[0.18em] text-[#94A3B8]">
          Cherry Autopilot
        </div>

        {/* Headline */}
        <h1 className="mb-3 text-[44px] font-medium tracking-[-0.01em] text-[#0F172A]">
          Money you can trust.
        </h1>
        {/* Cherry gradient accent bar */}
        <div className="mb-4 flex items-center gap-3">
          <div className="h-1 w-12 rounded-full bg-gradient-to-r from-[#C21733] to-[#E53E5A]" />
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[#C21733]" />
            <span className="h-1 w-1 rounded-full bg-[#F97373]" />
          </span>
        </div>

        {/* Supporting paragraph */}
        <p className="mb-14 max-w-xl text-[17px] leading-relaxed text-[#475569]">
          Cherry is the moment before you swipe—when the math still matters. It
          simulates rewards, bucket impact, and your end-of-month balance for
          every purchase.
        </p>

        {/* Hero Card */}
        <div
          className={cn(
            "rounded-[28px] border border-[#E2E8F0] bg-white p-8 shadow-[0_8px_24px_rgba(0,0,0,0.06)]",
            "md:p-8",
            "grid gap-6 md:gap-8 md:grid-cols-[1.6fr_1fr]",
          )}
        >
          {/* Left side: Copy and actions */}
          <div className="flex flex-col gap-10">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-[#0F172A]">
                How Autopilot works
              </h2>
              <p className="text-sm text-[#475569]">
                Cherry runs a quick simulation of your entire month and trades
                off this purchase against everything else you’ve planned.
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col pt-4">
              <ButtonLink
                href="/app"
                className={cn(
                  "w-full bg-[#C21733] text-white hover:bg-[#E53E5A]",
                  "border-0 font-semibold transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C21733]",
                )}
              >
                Open Autopilot
              </ButtonLink>

              {process.env.NODE_ENV !== "production" && (
                <ButtonLink
                  href="/simulations"
                  variant="secondary"
                  className="w-full mt-4 font-semibold text-[#0F172A]!"
                >
                  View simulations
                </ButtonLink>
              )}
            </div>
            <p className="mt-3 text-xs text-[#94A3B8]">
              No new card. No impact on credit. Works with the cards you already
              have.
            </p>
          </div>

          {/* Right side: Autopilot preview */}
          <div className="flex flex-col">
            <div className="mb-4 text-[11px] uppercase tracking-[0.18em] text-[#94A3B8]">
              What Autopilot actually decides
            </div>
            <div className="rounded-2xl border border-[#E2E8F0] bg-white/90 p-6 space-y-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
              {/* Upcoming purchase */}
              <div className="space-y-1.5">
                <div className="text-[11px] uppercase tracking-[0.16em] text-[#94A3B8]">
                  Upcoming purchase
                </div>
                <div className="text-sm font-medium text-[#0F172A]">
                  $42.18 · Din Tai Fung · Dining
                </div>
                <div className="text-[11px] text-[#94A3B8]">
                  Autopilot is simulating cards and buckets…
                </div>
              </div>

              {/* Card options */}
              <div className="space-y-3">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 rounded-xl bg-[#F8FAFC] px-3 py-2.5">
                  <div>
                    <div className="text-xs font-medium text-[#0F172A]">
                      Sapphire Preferred
                    </div>
                    <div className="mt-0.5 text-[11px] text-[#64748B]">
                      Earns the most rewards and keeps Dining at 78% of your
                      budget.
                    </div>
                  </div>

                  <div className="self-start text-right text-[11px] font-semibold text-[#16A34A]">
                    Best overall
                  </div>
                </div>

                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 rounded-xl px-3 py-2.5">
                  <div>
                    <div className="text-xs font-medium text-[#0F172A]">
                      Freedom Unlimited
                    </div>
                    <div className="mt-0.5 text-[11px] text-[#64748B]">
                      Fewer rewards and brings Dining to 82% of your budget.
                    </div>
                  </div>

                  <div className="self-start text-right text-[11px] font-semibold text-[#94A3B8]">
                    Keeps month similar
                  </div>
                </div>

                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 rounded-xl px-3 py-2.5">
                  <div>
                    <div className="text-xs font-medium text-[#0F172A]">
                      Apple Card
                    </div>
                    <div className="mt-0.5 text-[11px] text-[#64748B]">
                      Costs about $3 more in interest and pushes this budget
                      over its limit.
                    </div>
                  </div>

                  <div className="self-start text-right text-[11px] font-semibold text-[#DC2626]">
                    Avoid this
                  </div>
                </div>
              </div>

              {/* Month impact */}
              <div className="space-y-1.5 border-t border-[#E2E8F0] pt-4">
                <div className="text-[11px] uppercase tracking-[0.16em] text-[#94A3B8]">
                  Month impact with recommended card
                </div>
                <div className="mt-1 text-sm text-[#0F172A]">
                  Finish the month with{" "}
                  <span className="font-semibold">$118 more</span> and{" "}
                  <span className="font-semibold">3 fees avoided</span>.
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Setup + benefits strip */}
        <section className="mt-16 md:mt-20">
          <div className="mb-3 text-[11px] uppercase tracking-[0.18em] text-[#94A3B8]">
            Set up in minutes
          </div>
          <h2 className="text-lg font-semibold text-[#0F172A]">
            Your first 3 minutes with Autopilot
          </h2>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-[#E2E8F0] bg-white/80 p-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#C21733]">
                1 · Connect cards
              </div>
              <p className="text-sm text-[#475569]">
                Link the cards you already use. Cherry only needs read access to
                see transactions and balances.
              </p>
            </div>

            <div className="rounded-2xl border border-[#E2E8F0] bg-white/80 p-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#C21733]">
                2 · Set buckets
              </div>
              <p className="text-sm text-[#475569]">
                Decide how much you want to spend on essentials vs. lifestyle.
                Buckets mirror how you already think about money.
              </p>
            </div>

            <div className="rounded-2xl border border-[#E2E8F0] bg-white/80 p-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#C21733]">
                3 · Turn on Autopilot
              </div>
              <p className="text-sm text-[#475569]">
                At checkout, Cherry recommends the card and shows the impact on
                your buckets before you confirm the purchase.
              </p>
            </div>
          </div>

          <p className="mt-4 text-[11px] text-[#94A3B8]">
            You stay in control — Cherry never swipes for you or opens new
            accounts. It just does the math first.
          </p>
        </section>
        {/* Differentiation strip */}
        <section className="mt-20">
          <div className="mb-3 text-[11px] uppercase tracking-[0.18em] text-[#94A3B8]">
            Why Cherry feels different
          </div>
          <h2 className="text-lg font-semibold text-[#0F172A]">
            Everything else shows damage later. Cherry runs the month first.
          </h2>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-[#E2E8F0] bg-white/80 p-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#94A3B8]">
                Traditional banks
              </div>
              <ul className="space-y-1 text-sm text-[#64748B]">
                <li>• Show you damage after you spend.</li>
                <li>• Rewards are opaque and scattered.</li>
                <li>• Advice is generic, not yours.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-[#E2E8F0] bg-white/80 p-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#94A3B8]">
                Budgeting apps
              </div>
              <ul className="space-y-1 text-sm text-[#64748B]">
                <li>• Categorize after the fact.</li>
                <li>• Assume you’ll manually check them.</li>
                <li>• Don’t know which card you’ll use.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-[#C21733]/20 bg-[#FEF2F4] p-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#C21733]">
                Cherry Autopilot
              </div>
              <ul className="space-y-1 text-sm text-[#334155]">
                <li>
                  • Connects to the cards you already use — no new bank, no new
                  account.
                </li>
                <li>
                  • Simulates the rest of your month every time you tap your
                  card.
                </li>
                <li>
                  • Optimizes rewards, interest, and fees in the same pass.
                </li>
                <li>• Enforces the buckets you set—nothing more.</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
      {/* How Cherry thinks */}
      <section className="mt-20 bg-[#F1F5F9]">
        <div className="mx-auto max-w-4xl px-4 py-12">
          <div className="mb-3 text-[11px] uppercase tracking-[0.18em] text-[#94A3B8]">
            Under the hood
          </div>
          <h2 className="text-lg font-semibold text-[#0F172A]">
            How Cherry reasons about every purchase
          </h2>
          <p className="mt-2 max-w-xl text-sm text-[#475569]">
            Each time you’re about to pay, Cherry runs a tiny simulation of your
            month—choosing a card, assigning a bucket, and showing how this one
            charge trades off against everything else you’ve planned.
          </p>

          {/* Linear flow diagram */}
          <div className="mt-6 rounded-2xl border border-[#E2E8F0] bg-white px-5 py-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <FlowNode
                label="Upcoming purchase"
                sub="Amount, merchant, time"
              />
              <FlowArrow />
              <FlowNode label="Card logic" sub="Limits, APR, rewards, offers" />
              <FlowArrow />
              <FlowNode
                label="Bucket impact"
                sub="Which bucket, how much left"
              />
              <FlowArrow />
              <FlowNode
                label="Month forecast"
                sub="Projected balance + rewards"
              />
            </div>
          </div>

          <p className="mt-3 text-sm text-[#475569]">
            Cherry doesn’t just pick a card—it trades off this purchase against
            every other plan you’ve made for the month.
          </p>
          <p className="mt-3 text-[11px] text-[#94A3B8]">
            Cherry never moves money or charges your card. It only computes the
            outcomes so you can choose with full context.
          </p>
        </div>
      </section>
    </div>
  );
}

function FlowNode({ label, sub }: { label: string; sub: string }) {
  return (
    <div className="flex-1 min-w-[140px]">
      <div className="inline-flex items-center justify-center rounded-full bg-[#F8FAFC] px-3 py-1 text-[11px] font-medium tracking-[0.14em] uppercase text-[#94A3B8]">
        {label}
      </div>
      <p className="mt-2 text-xs text-[#64748B]">{sub}</p>
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="hidden h-px flex-1 items-center justify-center md:flex">
      <div className="h-px w-full bg-gradient-to-r from-[#E2E8F0] via-[#C21733] to-[#E2E8F0]" />
    </div>
  );
}
