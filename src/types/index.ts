/** Pre-built business profile for test system prompt + sample dataset */
export type TemplateKey =
  | "support"
  | "marketing"
  | "sales"
  | "legal"
  | "tool_calling";

/** Text-only evaluator metric keys */
export type TextMetricKey =
  | "accuracy"
  | "relevance"
  | "faithfulness"
  | "coherence"
  | "completeness"
  | "conciseness"
  | "tone";

/** Tool-calling evaluator metric keys */
export type ToolMetricKey =
  | "tool_selection"
  | "tool_args"
  | "tool_trajectory";

/** Keys used in evaluator JSON and UI */
export type MetricKey = TextMetricKey | ToolMetricKey;

export const METRIC_LABELS: Record<MetricKey, string> = {
  accuracy: "Accuracy",
  relevance: "Relevance",
  faithfulness: "Faithfulness",
  coherence: "Coherence",
  completeness: "Completeness",
  conciseness: "Conciseness",
  tone: "Tone",
  tool_selection: "Tool Selection",
  tool_args: "Argument Correctness",
  tool_trajectory: "Call Trajectory",
};

export const TEXT_METRIC_KEYS: TextMetricKey[] = [
  "accuracy",
  "relevance",
  "faithfulness",
  "coherence",
  "completeness",
  "conciseness",
  "tone",
];

export const TOOL_METRIC_KEYS: ToolMetricKey[] = [
  "tool_selection",
  "tool_args",
  "tool_trajectory",
];

export const ALL_METRIC_KEYS: MetricKey[] = [
  ...TEXT_METRIC_KEYS,
  ...TOOL_METRIC_KEYS,
];

/** Pass threshold: score >= PASS_THRESHOLD_PERCENT is pass */
export const PASS_THRESHOLD_PERCENT = 70;

export type ToolCallSpec = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export type ExpectedToolCall = {
  name: string;
  arguments: Record<string, unknown>;
};

export type ActualToolCall = {
  name: string;
  arguments: Record<string, unknown>;
};

export type TextEvalItem = {
  kind?: "text";
  input: string;
  expected_output: string;
};

export type ToolCallEvalItem = {
  kind: "tool_call";
  input: string;
  tools: ToolCallSpec[];
  expected_tool_calls: ExpectedToolCall[];
  notes?: string;
  expected_output: string;
};

export type EvalItem = TextEvalItem | ToolCallEvalItem;

export function isToolCallItem(item: EvalItem): item is ToolCallEvalItem {
  return item.kind === "tool_call";
}

export type MetricScore = {
  score: number;
  reasoning: string;
  passed: boolean;
};

export type EvalResult = {
  index: number;
  kind?: "text" | "tool_call";
  input: string;
  expected_output: string;
  actual_output: string;
  metrics: Partial<Record<MetricKey, MetricScore>>;
  latency_ms?: number;
  cost_usd?: number | null;
  error?: string;
  tool_calls?: ActualToolCall[];
  expected_tool_calls?: ExpectedToolCall[];
  tools?: ToolCallSpec[];
};

export type OpenRouterModelOption = {
  id: string;
  name: string;
  provider?: string;
  description?: string;
};

export type EvaluateRequestBody = {
  testModel: string;
  testSystemPrompt: string;
  evaluatorModel: string;
  evaluatorBasePrompt: string;
  activeMetrics: MetricKey[];
  dataset: EvalItem[];
};

export type UploadRequestBody = {
  experimentName: string;
  results: EvalResult[];
  activeMetrics: MetricKey[];
};

export type SSEProgressEvent = {
  type: "progress";
  index: number;
  total: number;
  result: EvalResult;
};

export type SSEDoneEvent = {
  type: "done";
  results: EvalResult[];
};

export type SSEErrorEvent = {
  type: "error";
  message: string;
};

export type SSEEvent = SSEProgressEvent | SSEDoneEvent | SSEErrorEvent;
