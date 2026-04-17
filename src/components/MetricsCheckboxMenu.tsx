"use client";

import { ALL_METRIC_KEYS, METRIC_LABELS, type MetricKey } from "@/types";

type Props = {
  activeMetrics: Set<MetricKey> | MetricKey[];
  onToggle: (key: MetricKey) => void;
  disabled?: boolean;
};

export function MetricsCheckboxMenu({
  activeMetrics,
  onToggle,
  disabled,
}: Props) {
  const set =
    activeMetrics instanceof Set
      ? activeMetrics
      : new Set<MetricKey>(activeMetrics);

  return (
    <fieldset
      disabled={disabled}
      className="rounded-lg border border-[#2f3336] bg-[#16181c] p-3"
    >
      <legend className="px-1 text-sm font-medium text-[#e7e9ea]">
        Evaluation criteria
      </legend>
      <p className="mb-2 text-xs text-[#71767b]">
        Toggle criteria to include in the evaluator system prompt. Pass threshold:{" "}
        ≥70%.
      </p>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {ALL_METRIC_KEYS.map((key) => (
          <li key={key}>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-[#e7e9ea]">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-[#2f3336] bg-[#0f1419] text-[#1d9bf0] focus:ring-[#1d9bf0]"
                checked={set.has(key)}
                onChange={() => onToggle(key)}
              />
              {METRIC_LABELS[key]}
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}
