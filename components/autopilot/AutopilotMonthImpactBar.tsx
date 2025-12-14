import type { JSX } from "react";

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

export function AutopilotMonthImpactBar({
  segments = defaultSegments,
}: {
  segments?: Segment[];
}): JSX.Element {
  return (
    <div className="space-y-1.5">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E2E8F0]">
        <div className="flex h-full">
          {segments.map((segment) => (
            <div
              key={segment.label}
              className={segment.color}
              style={{ flexBasis: `${segment.percentage}%` }}
              aria-label={segment.label}
            />
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between text-[10px] text-[#94A3B8]">
        <span>Essentials · 62% remaining</span>
        <span>Lifestyle · 34% remaining</span>
        <span>Other · stable</span>
      </div>
    </div>
  );
}
