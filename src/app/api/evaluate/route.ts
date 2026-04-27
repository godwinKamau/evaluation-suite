import { OpenRouter } from "@openrouter/agent";
import {
  buildEvaluatorSystemPrompt,
  buildJudgeUserMessage,
} from "@/lib/evaluator-prompt";
import {
  DATASET_MAX_FIELD_BYTES,
  DATASET_MAX_ROWS,
} from "@/lib/dataset-parse";
import { parseJudgeResponse, validateParsedMetrics } from "@/lib/parse-judge";
import { runToolCallEvalForItem } from "@/lib/run-tool-call-eval";
import type { EvaluateRequestBody, EvalResult, MetricKey, SSEEvent } from "@/types";
import {
  isToolCallItem,
  TEXT_METRIC_KEYS,
  TOOL_METRIC_KEYS,
  type TextMetricKey,
  type ToolMetricKey,
} from "@/types";

function utf8ByteLength(s: string): number {
  return new TextEncoder().encode(s).length;
}

function isTextMetricKey(key: MetricKey): key is TextMetricKey {
  return (TEXT_METRIC_KEYS as readonly string[]).includes(key);
}

function isToolMetricKey(key: MetricKey): key is ToolMetricKey {
  return (TOOL_METRIC_KEYS as readonly string[]).includes(key);
}

export const runtime = "nodejs";
export const maxDuration = 300;

function encodeSse(data: SSEEvent): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function extractResponseText(response: {
  outputText?: string;
  output?: unknown[];
}): string {
  if (typeof response.outputText === "string") {
    return response.outputText.trim();
  }

  const chunks: string[] = [];
  for (const item of response.output ?? []) {
    if (!isRecord(item) || !Array.isArray(item.content)) continue;
    for (const contentPart of item.content) {
      if (!isRecord(contentPart)) continue;
      const text = contentPart.text;
      if (typeof text === "string") chunks.push(text);
    }
  }

  return chunks.join("").trim();
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "OPENROUTER_API_KEY is not set in the environment." }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  let body: EvaluateRequestBody;
  try {
    body = (await request.json()) as EvaluateRequestBody;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const {
    testModel,
    testSystemPrompt,
    evaluatorModel,
    evaluatorBasePrompt,
    activeMetrics,
    dataset,
  } = body;

  if (!testModel?.trim()) {
    return new Response(
      JSON.stringify({ error: "testModel is required." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!activeMetrics?.length) {
    return new Response(
      JSON.stringify({ error: "Select at least one evaluation metric." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!Array.isArray(dataset) || dataset.length === 0) {
    return new Response(
      JSON.stringify({ error: "dataset must be a non-empty array." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  if (dataset.length > DATASET_MAX_ROWS) {
    return new Response(
      JSON.stringify({
        error: `Too many rows: ${dataset.length}. Max ${DATASET_MAX_ROWS}.`,
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const anyTool = dataset.some(isToolCallItem);
  if (anyTool && !dataset.every(isToolCallItem)) {
    return new Response(
      JSON.stringify({
        error: "Mixed-kind dataset: all rows must be text rows or tool-calling rows.",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const metrics = activeMetrics as MetricKey[];

  if (!anyTool && !evaluatorModel?.trim()) {
    return new Response(
      JSON.stringify({
        error: "evaluatorModel is required for text-evaluation datasets.",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  if (anyTool) {
    const bad = metrics.find((m) => !isToolMetricKey(m));
    if (bad) {
      return new Response(
        JSON.stringify({
          error: `Invalid metric "${bad}" for tool-calling dataset. Use only: ${TOOL_METRIC_KEYS.join(", ")}.`,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }
    const missing = TOOL_METRIC_KEYS.filter((m) => !metrics.includes(m));
    if (missing.length > 0) {
      return new Response(
        JSON.stringify({
          error: `Tool-calling dataset requires all tool metrics selected: missing ${missing.join(", ")}.`,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }
  } else {
    const bad = metrics.find((m) => !isTextMetricKey(m));
    if (bad) {
      return new Response(
        JSON.stringify({
          error: `Invalid metric "${bad}" for text dataset. Use only the seven text metrics.`,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  for (let i = 0; i < dataset.length; i++) {
    const row = dataset[i];
    if (
      !row ||
      typeof row.input !== "string" ||
      !row.input.trim() ||
      typeof row.expected_output !== "string"
    ) {
      return new Response(
        JSON.stringify({
          error: `dataset[${i}] must have non-empty input and string expected_output.`,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }
    if (utf8ByteLength(row.input) > DATASET_MAX_FIELD_BYTES) {
      return new Response(
        JSON.stringify({
          error: `Row ${i + 1}: field exceeds 8 KiB.`,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }
    if (utf8ByteLength(row.expected_output) > DATASET_MAX_FIELD_BYTES) {
      return new Response(
        JSON.stringify({
          error: `Row ${i + 1}: field exceeds 8 KiB.`,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }
    if (isToolCallItem(row)) {
      if (!Array.isArray(row.tools) || row.tools.length === 0) {
        return new Response(
          JSON.stringify({
            error: `Row ${i + 1}: 'tools' must be a non-empty array.`,
          }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }
      if (!Array.isArray(row.expected_tool_calls)) {
        return new Response(
          JSON.stringify({
            error: `Row ${i + 1}: 'expected_tool_calls' must be an array.`,
          }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }
      const toolsBytes = utf8ByteLength(JSON.stringify(row.tools));
      if (toolsBytes > DATASET_MAX_FIELD_BYTES) {
        return new Response(
          JSON.stringify({
            error: `Row ${i + 1}: 'tools' JSON exceeds 8 KiB.`,
          }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }
      const expectedBytes = utf8ByteLength(
        JSON.stringify(row.expected_tool_calls),
      );
      if (expectedBytes > DATASET_MAX_FIELD_BYTES) {
        return new Response(
          JSON.stringify({
            error: `Row ${i + 1}: 'expected_tool_calls' JSON exceeds 8 KiB.`,
          }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }
    }
  }

  const openrouter = new OpenRouter({ apiKey });
  const judgeInstructions = buildEvaluatorSystemPrompt(
    evaluatorBasePrompt || "You are a precise evaluation judge.",
    metrics,
  );

  const stream = new ReadableStream({
    async start(controller) {
      const send = (ev: SSEEvent) => controller.enqueue(encodeSse(ev));
      const results: EvalResult[] = [];

      try {
        const total = dataset.length;
        for (let i = 0; i < total; i++) {
          const item = dataset[i]!;

          if (isToolCallItem(item)) {
            const result = await runToolCallEvalForItem(i, item, {
              testModel,
              testSystemPrompt,
              apiKey,
              activeMetrics: metrics,
            });
            results.push(result);
            send({
              type: "progress",
              index: i + 1,
              total,
              result,
            });
            continue;
          }

          let actual_output = "";
          let error: string | undefined;
          let latency_ms: number | undefined;
          let cost_usd: number | null = null;

          const startedAt = Date.now();
          try {
            const testResult = openrouter.callModel({
              model: testModel,
              instructions: testSystemPrompt || "You are a helpful assistant.",
              input: item.input,
            });
            const response = await testResult.getResponse();
            latency_ms = Date.now() - startedAt;
            actual_output = extractResponseText(response);
            cost_usd = response.usage?.cost ?? null;
          } catch (e) {
            latency_ms = Date.now() - startedAt;
            error =
              e instanceof Error
                ? `Test model error: ${e.message}`
                : "Test model call failed.";
          }

          let metricScores: EvalResult["metrics"] = {};

          if (!error) {
            try {
              const judgeResult = openrouter.callModel({
                model: evaluatorModel!,
                instructions: judgeInstructions,
                input: buildJudgeUserMessage({
                  input: item.input,
                  expected_output: item.expected_output,
                  actual_output,
                }),
              });
              const judgeText = (await judgeResult.getText()).trim();
              metricScores = parseJudgeResponse(judgeText, metrics);
              const validationError = validateParsedMetrics(metricScores, metrics);
              if (validationError) {
                error = `Judge parse warning: ${validationError}. Raw: ${judgeText.slice(0, 400)}`;
              }
            } catch (e) {
              error =
                e instanceof Error
                  ? `Evaluator error: ${e.message}`
                  : "Evaluator call failed.";
            }
          }

          const result: EvalResult = {
            index: i,
            kind: "text",
            input: item.input,
            expected_output: item.expected_output,
            actual_output: error ? "" : actual_output,
            metrics: metricScores,
            latency_ms,
            cost_usd,
            error,
          };
          results.push(result);
          send({
            type: "progress",
            index: i + 1,
            total,
            result,
          });
        }

        send({ type: "done", results });
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Evaluation pipeline failed.";
        send({ type: "error", message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
