import { OpenRouter } from "@openrouter/agent";
import { buildEvaluatorSystemPrompt, buildJudgeUserMessage } from "@/lib/evaluator-prompt";
import {
  DATASET_MAX_FIELD_BYTES,
  DATASET_MAX_ROWS,
} from "@/lib/dataset-parse";
import { parseJudgeResponse, validateParsedMetrics } from "@/lib/parse-judge";
import type { EvaluateRequestBody, EvalResult, MetricKey, SSEEvent } from "@/types";

function utf8ByteLength(s: string): number {
  return new TextEncoder().encode(s).length;
}

export const runtime = "nodejs";
export const maxDuration = 300;

function encodeSse(data: SSEEvent): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
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

  if (!testModel?.trim() || !evaluatorModel?.trim()) {
    return new Response(
      JSON.stringify({ error: "testModel and evaluatorModel are required." }),
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
  }

  const metrics = activeMetrics as MetricKey[];
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
          const item = dataset[i];
          let actual_output = "";
          let error: string | undefined;

          try {
            const testResult = openrouter.callModel({
              model: testModel,
              instructions: testSystemPrompt || "You are a helpful assistant.",
              input: item.input,
            });
            actual_output = (await testResult.getText()).trim();
          } catch (e) {
            error =
              e instanceof Error
                ? `Test model error: ${e.message}`
                : "Test model call failed.";
          }

          let metricScores: EvalResult["metrics"] = {};

          if (!error) {
            try {
              const judgeResult = openrouter.callModel({
                model: evaluatorModel,
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
            input: item.input,
            expected_output: item.expected_output,
            actual_output: error ? "" : actual_output,
            metrics: metricScores,
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
