import type { JSX } from "react";

type Segment = {
  label: string;
  percentage: number;
  color: string;
};

const segments: Segment[] = [
  { label: "Essentials", percentage: 45, color: "bg-[#C21733]" },
  { label: "Lifestyle", percentage: 30, color: "bg-[#E53E5A]" },
  { label: "Other", percentage: 25, color: "bg-[#F97373]" },
];

export function AutopilotMonthImpactBar(): JSX.Element {
  return (
    <div className="space-y-2">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E2E8F0]">
        <div className="flex h-full w-full">
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
      <div className="flex gap-4 text-[11px] text-[#94A3B8]">
        {segments.map((segment) => (
          <div key={segment.label} className="flex items-center gap-1">
            <span className={`h-2 w-2 rounded-full ${segment.color}`} />
            <span>{segment.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
