import { Client } from "langsmith";
import { randomUUID } from "crypto";
import { EVAL_DATASET } from "@/lib/dataset";
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

  const exampleCreates = EVAL_DATASET.map((row, i) => ({
    dataset_id: dataset.id,
    inputs: { input: row.input },
    outputs: { expected_output: row.expected_output },
    metadata: { index: i },
  }));

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
      },
      error: result.error,
      start_time: Date.now(),
      end_time: Date.now(),
    });

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
