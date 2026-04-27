import { callModelWithTools } from "@/lib/openrouter-tools";
import { scoreToolCalls } from "@/lib/tool-call-scorer";
import type {
  EvalResult,
  MetricKey,
  MetricScore,
  ToolCallEvalItem,
} from "@/types";

export type InvokeToolsFn = typeof callModelWithTools;

/**
 * Runs one tool-calling eval row: OpenRouter tool completion + deterministic scores.
 * `deps.invokeTools` is injectable for unit tests.
 */
export async function runToolCallEvalForItem(
  index: number,
  item: ToolCallEvalItem,
  opts: {
    testModel: string;
    testSystemPrompt: string;
    apiKey: string;
    activeMetrics: MetricKey[];
  },
  deps: { invokeTools: InvokeToolsFn } = { invokeTools: callModelWithTools },
): Promise<EvalResult> {
  const startedAt = Date.now();
  try {
    const {
      tool_calls: tc,
      rawText,
      latency_ms,
      cost_usd,
    } = await deps.invokeTools({
      apiKey: opts.apiKey,
      model: opts.testModel,
      systemPrompt: opts.testSystemPrompt || "You are a helpful assistant.",
      userInput: item.input,
      tools: item.tools,
    });

    const scored = scoreToolCalls(item.expected_tool_calls, tc);
    const metrics: Partial<Record<MetricKey, MetricScore>> = {};
    for (const key of opts.activeMetrics) {
      if (key === "tool_selection") metrics[key] = scored.tool_selection;
      else if (key === "tool_args") metrics[key] = scored.tool_args;
      else if (key === "tool_trajectory") metrics[key] = scored.tool_trajectory;
    }

    const actual_output =
      tc.length > 0 ? JSON.stringify(tc, null, 2) : (rawText?.trim() ?? "");

    return {
      index,
      kind: "tool_call",
      input: item.input,
      expected_output: item.expected_output,
      actual_output,
      metrics,
      latency_ms,
      cost_usd,
      tool_calls: tc,
      expected_tool_calls: item.expected_tool_calls,
      tools: item.tools,
    };
  } catch (e) {
    const latency_ms = Date.now() - startedAt;
    const error =
      e instanceof Error
        ? `Test model error: ${e.message}`
        : "Test model call failed.";
    return {
      index,
      kind: "tool_call",
      input: item.input,
      expected_output: item.expected_output,
      actual_output: "",
      metrics: {},
      latency_ms,
      cost_usd: null,
      error,
      expected_tool_calls: item.expected_tool_calls,
      tools: item.tools,
    };
  }
}
