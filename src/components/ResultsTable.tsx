"use client";

import {
  METRIC_LABELS,
  PASS_THRESHOLD_PERCENT,
  type EvalResult,
  type MetricKey,
} from "@/types";

type Props = {
  results: EvalResult[];
  activeMetrics: MetricKey[];
};

export function ResultsTable({ results, activeMetrics }: Props) {
  if (results.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-lg border border-[#2f3336]">
      <table className="w-full min-w-[720px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-[#2f3336] bg-[#16181c]">
            <th className="p-3 font-semibold text-[#e7e9ea]">#</th>
            <th className="p-3 font-semibold text-[#e7e9ea]">Question</th>
            <th className="p-3 font-semibold text-[#e7e9ea]">Model answer</th>
            <th className="p-3 font-semibold text-[#e7e9ea]">Expected</th>
            {activeMetrics.map((k) => (
              <th key={k} className="p-3 font-semibold text-[#e7e9ea]">
                {METRIC_LABELS[k]}
              </th>
            ))}
            <th className="p-3 font-semibold text-[#e7e9ea]">Status</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => (
            <tr
              key={r.index}
              className="border-b border-[#2f3336] align-top hover:bg-[#16181c]/80"
            >
              <td className="p-3 text-[#71767b]">{r.index + 1}</td>
              <td className="max-w-xs p-3 text-[#e7e9ea]">{r.input}</td>
              <td className="max-w-xs p-3 text-[#e7e9ea]">
                {r.error ? (
                  <span className="text-red-400">{r.error}</span>
                ) : (
                  r.actual_output
                )}
              </td>
              <td className="max-w-xs p-3 text-[#71767b]">
                {r.expected_output}
              </td>
              {activeMetrics.map((k) => {
                const m = r.metrics[k];
                if (!m) {
                  return (
                    <td key={k} className="p-3 text-[#71767b]">
                      —
                    </td>
                  );
                }
                const pass = m.score >= PASS_THRESHOLD_PERCENT;
                return (
                  <td key={k} className="p-3">
                    <span
                      className={`inline-flex flex-col gap-0.5 rounded px-2 py-1 text-xs font-medium ${
                        pass
                          ? "bg-emerald-950/80 text-emerald-300"
                          : "bg-red-950/80 text-red-300"
                      }`}
                      title={m.reasoning}
                    >
                      {m.score}%
                      <span className="text-[10px] opacity-90">
                        {pass ? "PASS" : "FAIL"}
                      </span>
                    </span>
                  </td>
                );
              })}
              <td className="p-3 text-xs text-[#71767b]">
                {r.error ? "Error" : "OK"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
