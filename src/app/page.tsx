"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DatasetEditor } from "@/components/DatasetEditor";
import { MetricsCheckboxMenu } from "@/components/MetricsCheckboxMenu";
import { ModelSelector } from "@/components/ModelSelector";
import { ProgressIndicator } from "@/components/ProgressIndicator";
import { ResultsTable } from "@/components/ResultsTable";
import { SystemPromptEditor } from "@/components/SystemPromptEditor";
import {
  TemplateSelector,
  type TemplateSelection,
} from "@/components/TemplateSelector";
import { Win95Button } from "@/components/win95/Button";
import { Win95Input, Win95Textarea } from "@/components/win95/Input";
import { Win95Window } from "@/components/win95/Window";
import { BUSINESS_TEMPLATES } from "@/lib/business-templates";
import { EVAL_DATASET } from "@/lib/dataset";
import { buildEvaluatorSystemPrompt } from "@/lib/evaluator-prompt";
import { composeTestSystemPrompt } from "@/lib/test-injections";
import type {
  EvalItem,
  EvalResult,
  MetricKey,
  OpenRouterModelOption,
  SSEEvent,
} from "@/types";

const DEFAULT_TEST_PROMPT = "You are a helpful assistant.";
const DEFAULT_EVALUATOR_BASE =
  "You are an expert LLM evaluation judge. Be objective and concise.";

export default function HomePage() {
  const [models, setModels] = useState<OpenRouterModelOption[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [modelsError, setModelsError] = useState<string | null>(null);

  const [testModel, setTestModel] = useState("");
  const [evaluatorModel, setEvaluatorModel] = useState("");
  const [selectedTemplate, setSelectedTemplate] =
    useState<TemplateSelection>("custom");
  const [testBasePrompt, setTestBasePrompt] = useState(DEFAULT_TEST_PROMPT);
  const [dataset, setDataset] = useState<EvalItem[]>(() =>
    EVAL_DATASET.map((row) => ({ ...row })),
  );
  const [evaluatorBasePrompt, setEvaluatorBasePrompt] =
    useState(DEFAULT_EVALUATOR_BASE);

  const [activeMetrics, setActiveMetrics] = useState<Set<MetricKey>>(
    () =>
      new Set([
        "accuracy",
        "relevance",
        "faithfulness",
        "coherence",
        "completeness",
        "conciseness",
        "tone",
      ]),
  );

  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<EvalResult[]>([]);
  const [runError, setRunError] = useState<string | null>(null);

  const [experimentName, setExperimentName] = useState("llm-eval-run");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const fullEvaluatorPrompt = useMemo(
    () =>
      buildEvaluatorSystemPrompt(
        evaluatorBasePrompt,
        Array.from(activeMetrics),
      ),
    [evaluatorBasePrompt, activeMetrics],
  );

  const effectiveTestPrompt = useMemo(
    () => composeTestSystemPrompt(testBasePrompt, Array.from(activeMetrics)),
    [testBasePrompt, activeMetrics],
  );

  const handleTemplateChange = useCallback((value: TemplateSelection) => {
    setSelectedTemplate(value);
    if (value === "custom") {
      setTestBasePrompt(DEFAULT_TEST_PROMPT);
      setDataset(EVAL_DATASET.map((row) => ({ ...row })));
    } else {
      const t = BUSINESS_TEMPLATES[value];
      setTestBasePrompt(t.basePrompt);
      setDataset(t.samples.map((row) => ({ ...row })));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setModelsLoading(true);
      setModelsError(null);
      try {
        const res = await fetch("/api/models");
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error ?? "Failed to load models");
        }
        if (!cancelled) {
          setModels(data.models ?? []);
        }
      } catch (e) {
        if (!cancelled) {
          setModelsError(e instanceof Error ? e.message : "Unknown error");
        }
      } finally {
        if (!cancelled) setModelsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleMetric = useCallback((key: MetricKey) => {
    setActiveMetrics((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleSseEvent = useCallback((ev: SSEEvent) => {
    if (ev.type === "progress") {
      setProgress(ev.index);
      setResults((prev) => {
        const next = Array.from({ length: ev.index }, (_, i) =>
          i === ev.index - 1 ? ev.result : prev[i],
        ) as EvalResult[];
        return next;
      });
    } else if (ev.type === "done") {
      setResults(ev.results);
      setProgress(ev.results.length);
    } else if (ev.type === "error") {
      throw new Error(ev.message);
    }
  }, []);

  const runEvaluation = async () => {
    setRunError(null);
    setUploadSuccess(null);
    setResults([]);
    setProgress(0);

    if (!testModel || !evaluatorModel) {
      setRunError("Select both a test model and an evaluator model.");
      return;
    }
    if (activeMetrics.size === 0) {
      setRunError("Select at least one evaluation metric.");
      return;
    }
    if (dataset.length === 0) {
      setRunError("Add at least one row to the test dataset.");
      return;
    }
    const invalidRow = dataset.findIndex((row) => !row.input.trim());
    if (invalidRow !== -1) {
      setRunError(
        `Dataset row ${invalidRow + 1}: user prompt (input) cannot be empty.`,
      );
      return;
    }

    setRunning(true);

    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testModel,
          testSystemPrompt: effectiveTestPrompt,
          evaluatorModel,
          evaluatorBasePrompt,
          activeMetrics: Array.from(activeMetrics),
          dataset,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(
          typeof errJson.error === "string"
            ? errJson.error
            : `Request failed (${res.status})`,
        );
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let sep: number;
        while ((sep = buffer.indexOf("\n\n")) !== -1) {
          const block = buffer.slice(0, sep).trim();
          buffer = buffer.slice(sep + 2);
          if (block.startsWith("data: ")) {
            const ev = JSON.parse(block.slice(6)) as SSEEvent;
            handleSseEvent(ev);
          }
        }
      }

      const tail = buffer.trim();
      if (tail.startsWith("data: ")) {
        const ev = JSON.parse(tail.slice(6)) as SSEEvent;
        handleSseEvent(ev);
      }
    } catch (e) {
      setRunError(e instanceof Error ? e.message : "Evaluation failed.");
    } finally {
      setRunning(false);
    }
  };

  const uploadToLangSmith = async () => {
    setUploadError(null);
    setUploadSuccess(null);
    if (results.length === 0) {
      setUploadError("Run an evaluation first.");
      return;
    }
    setUploading(true);
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          experimentName,
          results,
          activeMetrics: Array.from(activeMetrics),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Upload failed");
      }
      setUploadSuccess(
        `Uploaded: dataset "${data.datasetName}", project "${data.projectName}" (${data.runIds?.length ?? 0} runs).`,
      );
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const metricList = Array.from(activeMetrics);

  const panelClass =
    "win95-raised flex flex-col gap-3.5 bg-win95-grey p-3.5";

  return (
    <main>
      <Win95Window title="LLM Evaluation Suite">
        <p className="mb-5 max-w-2xl text-[12px] text-black">
          Configure a test model and an LLM-as-judge, run on {dataset.length}{" "}
          dataset row(s), then upload results to LangSmith.
        </p>

        <div className="grid gap-5 lg:grid-cols-2">
          <section className={panelClass}>
            <h2 className="font-win95 text-[12px] font-bold text-black">
              Test model
            </h2>
            <ModelSelector
              id="test-model"
              label="Model under test"
              models={models}
              value={testModel}
              onChange={setTestModel}
              loading={modelsLoading}
              error={modelsError}
              disabled={running}
            />
            <TemplateSelector
              value={selectedTemplate}
              onChange={handleTemplateChange}
              disabled={running}
            />
            <SystemPromptEditor
              id="test-prompt"
              label="Base system prompt"
              value={testBasePrompt}
              onChange={setTestBasePrompt}
              disabled={running}
              rows={8}
              hint="Edit the base instructions. Evaluation criteria (right panel) append constraints under // Active Evaluation Constraints: in the preview below."
            />
            <div className="flex flex-col gap-1">
              <span className="font-win95 text-[12px] font-bold text-black">
                Effective test system prompt (live preview)
              </span>
              <Win95Textarea
                readOnly
                rows={12}
                className="font-mono text-[12px] leading-relaxed text-black"
                value={effectiveTestPrompt}
              />
            </div>
          </section>

          <section className={panelClass}>
            <h2 className="font-win95 text-[12px] font-bold text-black">
              Evaluator (judge)
            </h2>
            <ModelSelector
              id="eval-model"
              label="Judge model"
              models={models}
              value={evaluatorModel}
              onChange={setEvaluatorModel}
              loading={modelsLoading}
              error={modelsError}
              disabled={running}
            />
            <SystemPromptEditor
              id="eval-base"
              label="Evaluator base instructions"
              value={evaluatorBasePrompt}
              onChange={setEvaluatorBasePrompt}
              disabled={running}
              rows={4}
              hint="Criteria below are appended automatically with pass/fail at 70%."
            />
            <MetricsCheckboxMenu
              activeMetrics={activeMetrics}
              onToggle={toggleMetric}
              disabled={running}
            />
            <div className="flex flex-col gap-1">
              <span className="font-win95 text-[12px] font-bold text-black">
                Full evaluator system prompt (live preview)
              </span>
              <Win95Textarea
                readOnly
                rows={12}
                className="font-mono text-[12px] leading-relaxed text-black"
                value={fullEvaluatorPrompt}
              />
            </div>
          </section>
        </div>

        <section className={`mt-5 ${panelClass}`}>
          <DatasetEditor
            items={dataset}
            onChange={setDataset}
            disabled={running}
          />
        </section>

        <section className={`mt-5 ${panelClass}`}>
          <h2 className="font-win95 text-[12px] font-bold text-black">Run</h2>
          <ProgressIndicator
            current={progress}
            total={dataset.length}
            active={running}
          />
          {runError ? (
            <p
              className="win95-sunken bg-white p-2.5 font-win95 text-[12px] text-black"
              role="alert"
            >
              {runError}
            </p>
          ) : null}
          <div className="flex flex-wrap items-end gap-2">
            <Win95Button
              variant="preferred"
              onClick={runEvaluation}
              disabled={running || modelsLoading}
            >
              {running ? "Running…" : "Run evaluation"}
            </Win95Button>
          </div>
        </section>

        {results.length > 0 ? (
          <section className="mt-5 flex flex-col gap-5">
            <h2 className="font-win95 text-[12px] font-bold text-black">
              Results
            </h2>
            <ResultsTable results={results} activeMetrics={metricList} />

            <div className={panelClass}>
              <h3 className="font-win95 text-[12px] font-bold text-black">
                LangSmith upload
              </h3>
              <p className="text-[12px] text-win95-dark-grey">
                Creates a dataset, an experiment project linked to it, one run
                per row, and feedback scores per metric. Requires{" "}
                <code className="font-mono text-black">LANGSMITH_API_KEY</code>{" "}
                on the server.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="flex flex-1 flex-col gap-1">
                  <label
                    htmlFor="exp-name"
                    className="font-win95 text-[12px] font-bold text-black"
                  >
                    Experiment name
                  </label>
                  <Win95Input
                    id="exp-name"
                    value={experimentName}
                    onChange={(e) => setExperimentName(e.target.value)}
                    disabled={uploading}
                  />
                </div>
                <Win95Button
                  onClick={uploadToLangSmith}
                  disabled={uploading}
                >
                  {uploading ? "Uploading…" : "Upload to LangSmith"}
                </Win95Button>
              </div>
              {uploadError ? (
                <p className="font-win95 text-[12px] text-black">{uploadError}</p>
              ) : null}
              {uploadSuccess ? (
                <p className="font-win95 text-[12px] text-black">{uploadSuccess}</p>
              ) : null}
            </div>
          </section>
        ) : null}
      </Win95Window>
    </main>
  );
}
