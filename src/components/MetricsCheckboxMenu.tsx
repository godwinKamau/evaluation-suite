"use client";

import { Win95Checkbox } from "@/components/win95/Checkbox";
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
      className="win95-sunken bg-win95-grey p-2"
    >
      <legend className="px-1 font-win95 text-[11px] font-bold text-black">
        Evaluation criteria
      </legend>
      <p className="mb-2 text-[11px] text-win95-dark-grey">
        Toggle criteria for the judge prompt and for test-model instruction
        injections (see Test model → effective prompt preview). Pass threshold:{" "}
        ≥70%.
      </p>
      <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
        {ALL_METRIC_KEYS.map((key) => (
          <li key={key}>
            <Win95Checkbox
              checked={set.has(key)}
              onChange={() => onToggle(key)}
              disabled={disabled}
            >
              {METRIC_LABELS[key]}
            </Win95Checkbox>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}
