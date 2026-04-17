import {
  METRIC_LABELS,
  PASS_THRESHOLD_PERCENT,
  type MetricKey,
  type MetricScore,
} from "@/types";

function stripJsonFence(text: string): string {
  const trimmed = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(trimmed);
  if (fence) return fence[1].trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}

export function parseJudgeResponse(
  raw: string,
  activeMetrics: MetricKey[],
): Partial<Record<MetricKey, MetricScore>> {
  const jsonStr = stripJsonFence(raw);
  let parsed: { metrics?: Record<string, { score?: number; reasoning?: string }> };
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    return {};
  }
  const metrics = parsed.metrics ?? {};
  const out: Partial<Record<MetricKey, MetricScore>> = {};

  for (const key of activeMetrics) {
    const entry = metrics[key] ?? metrics[key.toLowerCase()];
    if (!entry || typeof entry.score !== "number") continue;
    const score = Math.max(0, Math.min(100, Math.round(entry.score)));
    out[key] = {
      score,
      reasoning:
        typeof entry.reasoning === "string"
          ? entry.reasoning
          : "No reasoning provided.",
      passed: score >= PASS_THRESHOLD_PERCENT,
    };
  }
  return out;
}

/** If JSON parse fails, surface error message mentioning expected keys */
export function validateParsedMetrics(
  parsed: Partial<Record<MetricKey, MetricScore>>,
  activeMetrics: MetricKey[],
): string | null {
  const missing = activeMetrics.filter((k) => parsed[k] === undefined);
  if (missing.length === 0) return null;
  return `Missing or invalid scores for: ${missing.map((k) => METRIC_LABELS[k]).join(", ")}`;
}
