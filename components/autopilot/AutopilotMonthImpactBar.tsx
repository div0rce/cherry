import React, { type JSX } from "react";

void React;

type Segment = {
  label: string;
  percentage: number;
  color: string;
};

const defaultSegments: Segment[] = [
  { label: "Essentials", percentage: 45, color: "bg-[#BBF7D0]" },
  { label: "Lifestyle", percentage: 30, color: "bg-[#FED7E2]" },
  { label: "Other", percentage: 25, color: "bg-[#E5E7EB]" },
];

type NormalizedSegment = Segment & { share: number };

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Number(value.toFixed(1));
}

function normalizeSegments(segments: Segment[]): NormalizedSegment[] {
  const safeSegments = segments.length > 0 ? segments : defaultSegments;
  const clamped = safeSegments.map((segment, index) => ({
    label: segment.label,
    percentage: clampPercent(segment.percentage),
    color: segment.color ?? defaultSegments[index % defaultSegments.length]?.color ?? "bg-[#E5E7EB]",
  }));

  const total = clamped.reduce((acc, segment) => acc + segment.percentage, 0);
  const divisor = total > 0 ? total : 1;

  return clamped.map((segment) => ({
    ...segment,
    share: Number(((segment.percentage / divisor) * 100).toFixed(1)),
  }));
}

export function AutopilotMonthImpactBar({
  segments = defaultSegments,
}: {
  segments?: Segment[];
}): JSX.Element {
  const normalized = normalizeSegments(segments);

  return (
    <div className="space-y-3">
      <div className="h-2 w-full overflow-hidden rounded-full bg-[#E2E8F0]">
        <div className="flex h-full">
          {normalized.map((segment) => (
            <div
              key={segment.label}
              className={segment.color}
              style={{ flexBasis: `${segment.share}%` }}
              aria-label={`${segment.label} ${segment.percentage}%`}
            />
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 text-[11px] text-[#475569]">
        {normalized.map((segment) => (
          <span
            key={segment.label}
            className="inline-flex items-center gap-2 rounded-full bg-white px-2 py-1 shadow-sm ring-1 ring-[#E2E8F0]"
          >
            <span className={`h-2 w-2 rounded-full ${segment.color}`} aria-hidden />
            <span className="font-semibold text-[#0F172A]">{segment.label}</span>
            <span className="text-[#64748B]">{segment.percentage}%</span>
          </span>
        ))}
      </div>
    </div>
  );
}
