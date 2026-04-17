"use client";

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
  return (
    <div
      className="rounded-lg border border-[#2f3336] bg-[#16181c] p-4"
      role="status"
      aria-live="polite"
    >
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium text-[#e7e9ea]">
          {active ? `${label} ${current}/${total}…` : "Idle"}
        </span>
        <span className="text-[#71767b]">{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[#2f3336]">
        <div
          className="h-full rounded-full bg-[#1d9bf0] transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
