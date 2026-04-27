import { ALL_METRIC_KEYS, type MetricKey } from "@/types";

/** One concise instruction per evaluation dimension, appended to the test model system prompt. */
export const METRIC_INJECTIONS: Partial<Record<MetricKey, string>> = {
  accuracy:
    "Ensure factual claims are correct; if you cannot verify a fact, say so and avoid guessing.",
  relevance:
    "Stay strictly on topic and address what the user asked; do not add unrelated material.",
  faithfulness:
    "Never assert facts you cannot verify from the conversation or provided context; if uncertain, state your limitations explicitly.",
  coherence:
    "Structure your answer clearly with logical flow so each part supports the next.",
  completeness:
    "Address every part of the user's request; if something cannot be answered, acknowledge the gap.",
  conciseness:
    "Be concise: prefer short, direct wording unless the user asks for depth or detail.",
  tone:
    "Match the tone implied by the role and context (e.g. professional, empathetic) consistently.",
};

const CONSTRAINTS_HEADER = "// Active Evaluation Constraints:";

/**
 * Composes the final test system prompt: base prompt + optional constraints block from active metrics.
 */
export function composeTestSystemPrompt(
  basePrompt: string,
  activeMetrics: Iterable<MetricKey>,
): string {
  const base = basePrompt.trim();
  const set = new Set(activeMetrics);
  const ordered = ALL_METRIC_KEYS.filter(
    (k) => set.has(k) && METRIC_INJECTIONS[k] !== undefined,
  );
  if (ordered.length === 0) {
    return base;
  }
  const bullets = ordered
    .map((k) => `- ${METRIC_INJECTIONS[k]!}`)
    .join("\n");
  return `${base}\n\n${CONSTRAINTS_HEADER}\n${bullets}`;
}
