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

function formatActualOutput(r: EvalResult): string {
  if (r.error) return "";
  if (r.kind === "tool_call" && r.tool_calls && r.tool_calls.length > 0) {
    return JSON.stringify(r.tool_calls, null, 2);
  }
  return r.actual_output;
}

function formatCost(cost: number | null | undefined): string {
  if (cost == null) return "—";
  return `$${cost.toFixed(6)}`;
}

function formatLatency(ms: number | undefined): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function ToolDiffBadge({ r }: { r: EvalResult }) {
  if (r.kind !== "tool_call") return "—";
  const sel = r.metrics.tool_selection;
  const args = r.metrics.tool_args;
  const traj = r.metrics.tool_trajectory;
  const bit = (m: typeof sel) => (m ? (m.passed ? "✓" : "✗") : "?");
  return (
    <span className="inline-flex flex-wrap gap-x-1 font-mono text-[11px] text-black">
      <span title={sel?.reasoning}>{bit(sel)} name</span>
      <span title={args?.reasoning}>{bit(args)} args</span>
      <span title={traj?.reasoning}>{bit(traj)} traj</span>
    </span>
  );
}

export function ResultsTable({ results, activeMetrics }: Props) {
  if (results.length === 0) return null;

  const showToolDiff = results.some((r) => r.kind === "tool_call");

  const cellSunken =
    "border border-black border-t-white border-l-white border-b-win95-shadow border-r-win95-shadow bg-win95-input p-2.5 align-top font-win95 text-[12px] leading-snug text-black";

  const thClass =
    "border border-black border-t-white border-l-white border-b-win95-shadow border-r-win95-shadow bg-win95-grey p-2.5 text-left font-win95 text-[12px] font-bold text-black";

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
            <th className={thClass}>Cost (USD)</th>
            <th className={thClass}>Latency (ms)</th>
            {showToolDiff ? (
              <th className={thClass}>Tool diff</th>
            ) : null}
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
              <td className={`${cellSunken} max-w-xs whitespace-pre-wrap font-mono`}>
                {r.error ? (
                  <span className="text-black underline">{r.error}</span>
                ) : (
                  formatActualOutput(r)
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
                      className={`inline-flex flex-col gap-0.5 border border-black px-1 py-0.5 font-win95 text-[11px] ${
                        pass
                          ? "bg-[#c0dcc0] text-black"
                          : "bg-[#ffc0c0] text-black"
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
              <td className={`${cellSunken} font-mono`}>
                {formatCost(r.error ? null : r.cost_usd)}
              </td>
              <td className={`${cellSunken} font-mono`}>
                {formatLatency(r.latency_ms)}
              </td>
              {showToolDiff ? (
                <td className={cellSunken}>
                  <ToolDiffBadge r={r} />
                </td>
              ) : null}
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
