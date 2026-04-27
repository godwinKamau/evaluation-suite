"use client";

import { Win95Checkbox } from "@/components/win95/Checkbox";
import {
  METRIC_LABELS,
  TEXT_METRIC_KEYS,
  TOOL_METRIC_KEYS,
  type MetricKey,
} from "@/types";

function isToolMetricKeyGroup(keys: MetricKey[]): boolean {
  if (keys.length !== TOOL_METRIC_KEYS.length) return false;
  return TOOL_METRIC_KEYS.every((k) => keys.includes(k));
}

type Props = {
  activeMetrics: Set<MetricKey> | MetricKey[];
  onToggle: (key: MetricKey) => void;
  disabled?: boolean;
  /** Which metrics appear in this menu (defaults to text / judge metrics). */
  metricKeys?: MetricKey[];
  /** When true, all shown metrics stay selected and cannot be toggled. */
  lockToggles?: boolean;
};

export function MetricsCheckboxMenu({
  activeMetrics,
  onToggle,
  disabled,
  metricKeys = TEXT_METRIC_KEYS,
  lockToggles = false,
}: Props) {
  const set =
    activeMetrics instanceof Set
      ? activeMetrics
      : new Set<MetricKey>(activeMetrics);

  const isToolPanel = isToolMetricKeyGroup(metricKeys);

  return (
    <fieldset
      disabled={disabled}
      className="win95-sunken bg-win95-grey p-2.5"
    >
      <legend className="-ml-0.5 bg-win95-grey px-1.5 font-win95 text-[12px] font-bold text-black">
        Evaluation criteria
      </legend>
      <p className="mb-2 text-[12px] text-win95-dark-grey">
        {isToolPanel
          ? "Deterministic tool-call scores (pass ≥70%). The judge model is not used for these rows. All three metrics must be selected to run an evaluation."
          : lockToggles
            ? "Tool-calling mode uses three deterministic scores (all required). The judge model is not used for these rows."
            : "Toggle criteria for the judge prompt and for test-model instruction injections (see Test model → effective prompt preview). Pass threshold: ≥70%."}
      </p>
      <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
        {metricKeys.map((key) => (
          <li key={key}>
            <Win95Checkbox
              checked={set.has(key)}
              onChange={() => {
                if (!lockToggles) onToggle(key);
              }}
              disabled={disabled || lockToggles}
            >
              {METRIC_LABELS[key]}
            </Win95Checkbox>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}
