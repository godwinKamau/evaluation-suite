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

  const cellSunken =
    "border border-black border-t-white border-l-white border-b-win95-shadow border-r-win95-shadow bg-win95-input p-2 align-top font-win95 text-[11px] leading-snug text-black";

  const thClass =
    "border border-black border-t-white border-l-white border-b-win95-shadow border-r-win95-shadow bg-win95-grey p-2 text-left font-win95 text-[11px] font-bold text-black";

  return (
    <div className="win95-sunken max-w-full overflow-x-auto bg-win95-grey p-1">
      <table className="w-full min-w-[720px] border-collapse">
        <thead>
          <tr>
            <th className={thClass}>#</th>
            <th className={thClass}>Question</th>
            <th className={thClass}>Model answer</th>
            <th className={thClass}>Expected</th>
            {activeMetrics.map((k) => (
              <th key={k} className={thClass}>
                {METRIC_LABELS[k]}
              </th>
            ))}
            <th className={thClass}>Status</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => (
            <tr key={r.index}>
              <td className={`${cellSunken} text-win95-dark-grey`}>
                {r.index + 1}
              </td>
              <td className={`${cellSunken} max-w-xs`}>{r.input}</td>
              <td className={`${cellSunken} max-w-xs`}>
                {r.error ? (
                  <span className="text-black underline">{r.error}</span>
                ) : (
                  r.actual_output
                )}
              </td>
              <td className={`${cellSunken} max-w-xs text-win95-dark-grey`}>
                {r.expected_output}
              </td>
              {activeMetrics.map((k) => {
                const m = r.metrics[k];
                if (!m) {
                  return (
                    <td key={k} className={cellSunken}>
                      —
                    </td>
                  );
                }
                const pass = m.score >= PASS_THRESHOLD_PERCENT;
                return (
                  <td key={k} className={cellSunken}>
                    <span
                      className={`inline-flex flex-col gap-0.5 border border-black px-1 py-0.5 font-win95 text-[10px] ${
                        pass
                          ? "bg-[#c0dcc0] text-black"
                          : "bg-[#ffc0c0] text-black"
                      }`}
                      title={m.reasoning}
                    >
                      {m.score}%
                      <span className="text-[9px] opacity-90">
                        {pass ? "PASS" : "FAIL"}
                      </span>
                    </span>
                  </td>
                );
              })}
              <td className={`${cellSunken} text-win95-dark-grey`}>
                {r.error ? "Error" : "OK"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
