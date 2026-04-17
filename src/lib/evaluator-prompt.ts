import {
  METRIC_LABELS,
  PASS_THRESHOLD_PERCENT,
  type MetricKey,
} from "@/types";

/** Compose full evaluator system prompt from base text + active criteria */
export function buildEvaluatorSystemPrompt(
  basePrompt: string,
  activeMetrics: MetricKey[],
): string {
  const criteriaList = activeMetrics
    .map((k) => `- ${METRIC_LABELS[k]} (${k}): score 0-100; pass if ≥ ${PASS_THRESHOLD_PERCENT}%`)
    .join("\n");

  const jsonKeys = activeMetrics
    .map((k) => `    "${k}": { "score": <number>, "reasoning": "<string>" }`)
    .join(",\n");

  return `${basePrompt.trim()}

You are an expert LLM evaluation judge. Score only these active criteria (0-100 each). Pass threshold: ${PASS_THRESHOLD_PERCENT}% or higher.

Active criteria:
${criteriaList}

Respond with a single JSON object only (no markdown fences), exactly in this shape:
{
  "metrics": {
${jsonKeys}
  }
}`;
}

export function buildJudgeUserMessage(input: {
  input: string;
  expected_output: string;
  actual_output: string;
}): string {
  return `Evaluate the model response against the reference.

<input>
${input.input}
</input>

<expected_output>
${input.expected_output}
</expected_output>

<actual_output>
${input.actual_output}
</actual_output>

Return only the JSON object as specified in your instructions.`;
}
