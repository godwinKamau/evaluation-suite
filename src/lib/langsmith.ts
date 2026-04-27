import { Client } from "langsmith";
import { randomUUID } from "crypto";
import type { EvalResult, MetricKey } from "@/types";

function getLangSmithClient(): Client {
  const apiKey = process.env.LANGSMITH_API_KEY;
  if (!apiKey) {
    throw new Error("LANGSMITH_API_KEY is not set in the environment.");
  }
  return new Client({ apiKey });
}

export type UploadExperimentResult = {
  datasetId: string;
  datasetName: string;
  projectId: string;
  projectName: string;
  runIds: string[];
};

/**
 * Creates a LangSmith Dataset + Examples, a Project (experiment) linked to the dataset,
 * one Run per item with inputs/outputs/reference, and feedback scores per metric.
 */
export async function uploadExperimentToLangSmith(options: {
  experimentName: string;
  results: EvalResult[];
  activeMetrics: MetricKey[];
}): Promise<UploadExperimentResult> {
  const { experimentName, results, activeMetrics } = options;
  const client = getLangSmithClient();

  const safeName = experimentName.replace(/[^\w\-./\s]/g, "_").slice(0, 80);
  const suffix = Date.now();
  const datasetName = `${safeName}-dataset-${suffix}`;
  const projectName = `${safeName}-experiment-${suffix}`;

  const dataset = await client.createDataset(datasetName, {
    description: `Evaluation dataset for ${experimentName}`,
    dataType: "kv",
  });

  const exampleCreates = results.map((row, i) => {
    if (row.kind === "tool_call") {
      return {
        dataset_id: dataset.id,
        inputs: { input: row.input, tools: row.tools ?? [] },
        outputs: {
          expected_tool_calls: row.expected_tool_calls ?? [],
          expected_output: row.expected_output,
        },
        metadata: { index: i },
      };
    }
    return {
      dataset_id: dataset.id,
      inputs: { input: row.input },
      outputs: { expected_output: row.expected_output },
      metadata: { index: i },
    };
  });

  const examples = await client.createExamples(exampleCreates);

  const project = await client.createProject({
    projectName,
    description: `LLM evaluation experiment: ${experimentName}`,
    referenceDatasetId: dataset.id,
    upsert: false,
  });

  const runIds: string[] = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const example = examples[i];
    const runId = randomUUID();
    const latencyMs = result.latency_ms ?? null;
    const endTime = Date.now();
    const startTime = endTime - (latencyMs ?? 0);
    const metadata = {
      cost_usd: result.cost_usd ?? null,
      latency_ms: latencyMs,
    };

    if (result.kind === "tool_call") {
      const toolCalls = result.tool_calls ?? [];
      await client.createRun({
        id: runId,
        name: `eval-${i + 1}`,
        run_type: "llm",
        project_name: projectName,
        reference_example_id: example?.id,
        inputs: {
          input: result.input,
          tools: result.tools ?? [],
        },
        outputs: {
          tool_calls: toolCalls,
          messages: [
            {
              role: "assistant",
              content: toolCalls.map((tc, j) => ({
                type: "tool_call",
                name: tc.name,
                args: tc.arguments,
                id: `call_${j + 1}`,
              })),
            },
          ],
          ...(result.error ? { error: result.error } : {}),
        },
        extra: {
          reference_outputs: {
            expected_tool_calls: result.expected_tool_calls ?? [],
          },
          evaluation_metrics: activeMetrics,
          metadata,
        },
        error: result.error,
        start_time: startTime,
        end_time: endTime,
      });
    } else {
      await client.createRun({
        id: runId,
        name: `eval-${i + 1}`,
        run_type: "chain",
        project_name: projectName,
        reference_example_id: example?.id,
        inputs: {
          input: result.input,
        },
        outputs: {
          actual_output: result.actual_output,
          ...(result.error ? { error: result.error } : {}),
        },
        extra: {
          reference_outputs: { expected_output: result.expected_output },
          evaluation_metrics: activeMetrics,
          metadata,
        },
        error: result.error,
        start_time: startTime,
        end_time: endTime,
      });
    }

    runIds.push(runId);

    for (const key of activeMetrics) {
      const m = result.metrics[key];
      if (!m) continue;
      await client.createFeedback(runId, `metric_${key}`, {
        score: m.score / 100,
        comment: m.reasoning,
      });
    }
  }

  await client.flush();

  return {
    datasetId: dataset.id,
    datasetName: dataset.name ?? datasetName,
    projectId: project.id,
    projectName: project.name ?? projectName,
    runIds,
  };
}
