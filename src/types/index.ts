/** Keys used in evaluator JSON and UI */
export type MetricKey =
  | "accuracy"
  | "relevance"
  | "faithfulness"
  | "coherence"
  | "completeness"
  | "conciseness"
  | "tone";

export const METRIC_LABELS: Record<MetricKey, string> = {
  accuracy: "Accuracy",
  relevance: "Relevance",
  faithfulness: "Faithfulness",
  coherence: "Coherence",
  completeness: "Completeness",
  conciseness: "Conciseness",
  tone: "Tone",
};

export const ALL_METRIC_KEYS: MetricKey[] = [
  "accuracy",
  "relevance",
  "faithfulness",
  "coherence",
  "completeness",
  "conciseness",
  "tone",
];

/** Pass threshold: score >= PASS_THRESHOLD_PERCENT is pass */
export const PASS_THRESHOLD_PERCENT = 70;

export type EvalItem = {
  input: string;
  expected_output: string;
};

export type MetricScore = {
  score: number;
  reasoning: string;
  passed: boolean;
};

export type EvalResult = {
  index: number;
  input: string;
  expected_output: string;
  actual_output: string;
  metrics: Partial<Record<MetricKey, MetricScore>>;
  error?: string;
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
