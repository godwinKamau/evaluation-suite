"use client";

type Props = {
  value: number;
  /** 0–100 */
  max?: number;
  className?: string;
};

/**
 * Win95-style progress: sunken track + segmented blue blocks.
 */
export function Win95ProgressBar({ value, max = 100, className = "" }: Props) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const segments = 24;
  const filled = Math.round((pct / 100) * segments);

  return (
    <div
      className={`w-full bg-win95-input p-0.5 shadow-[inset_-1px_-1px_0_0_#fff,inset_1px_1px_0_0_#000,inset_-2px_-2px_0_0_#dfdfdf,inset_2px_2px_0_0_#7f7f7f] ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="flex h-[14px] w-full gap-px">
        {Array.from({ length: segments }, (_, i) => (
          <div
            // eslint-disable-next-line react/no-array-index-key -- static segment strip
            key={i}
            className={`min-w-0 flex-1 ${
              i < filled ? "bg-win95-progress" : "bg-win95-input"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
