"use client";

import { Win95ProgressBar } from "@/components/win95/ProgressBar";

type Props = {
  current: number;
  total: number;
  label?: string;
  active?: boolean;
};

export function ProgressIndicator({
  current,
  total,
  label = "Evaluating",
  active,
}: Props) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  const inFlight = active && total > 0 ? Math.min(current + 1, total) : current;
  return (
    <div
      className="win95-sunken bg-win95-grey p-2.5"
      role="status"
      aria-live="polite"
    >
      <div className="mb-1 flex items-center justify-between font-win95 text-[12px] text-black">
        <span className="font-bold">
          {active ? `${label} ${inFlight}/${total}…` : "Idle"}
        </span>
        <span className="text-win95-dark-grey">{pct}%</span>
      </div>
      <Win95ProgressBar value={pct} max={100} />
    </div>
  );
}
