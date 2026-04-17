"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MetricsCheckboxMenu } from "@/components/MetricsCheckboxMenu";
import { ModelSelector } from "@/components/ModelSelector";
import { ProgressIndicator } from "@/components/ProgressIndicator";
import { ResultsTable } from "@/components/ResultsTable";
import { SystemPromptEditor } from "@/components/SystemPromptEditor";
import { buildEvaluatorSystemPrompt } from "@/lib/evaluator-prompt";
import { EVAL_DATASET } from "@/lib/dataset";
import type {
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
  const [testSystemPrompt, setTestSystemPrompt] = useState(DEFAULT_TEST_PROMPT);
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

    setRunning(true);

    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testModel,
          testSystemPrompt,
          evaluatorModel,
          evaluatorBasePrompt,
          activeMetrics: Array.from(activeMetrics),
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

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-10">
      <header className="mb-10 border-b border-[#2f3336] pb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-[#e7e9ea]">
          LLM Evaluation Suite
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[#71767b]">
          Configure a test model and an LLM-as-judge, run on {EVAL_DATASET.length}{" "}
          fixed examples, then upload results to LangSmith.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="flex flex-col gap-4 rounded-xl border border-[#2f3336] bg-[#16181c]/50 p-5">
          <h2 className="text-lg font-medium text-[#e7e9ea]">Test model</h2>
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
          <SystemPromptEditor
            id="test-prompt"
            label="System prompt"
            value={testSystemPrompt}
            onChange={setTestSystemPrompt}
            disabled={running}
            hint="Applied to the test model for every dataset question."
          />
        </section>

        <section className="flex flex-col gap-4 rounded-xl border border-[#2f3336] bg-[#16181c]/50 p-5">
          <h2 className="text-lg font-medium text-[#e7e9ea]">
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
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#e7e9ea]">
              Full evaluator system prompt (live preview)
            </label>
            <textarea
              readOnly
              rows={12}
              className="resize-y rounded-lg border border-dashed border-[#2f3336] bg-[#0f1419] px-3 py-2 font-mono text-xs leading-relaxed text-[#a8b0b7]"
              value={fullEvaluatorPrompt}
            />
          </div>
        </section>
      </div>

      <section className="mt-8 flex flex-col gap-4 rounded-xl border border-[#2f3336] bg-[#16181c]/50 p-5">
        <h2 className="text-lg font-medium text-[#e7e9ea]">Run</h2>
        <ProgressIndicator
          current={progress}
          total={EVAL_DATASET.length}
          active={running}
        />
        {runError ? (
          <p className="rounded-lg border border-red-900/80 bg-red-950/40 px-3 py-2 text-sm text-red-300">
            {runError}
          </p>
        ) : null}
        <div className="flex flex-wrap items-end gap-4">
          <button
            type="button"
            onClick={runEvaluation}
            disabled={running || modelsLoading}
            className="rounded-lg bg-[#1d9bf0] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1a8cd8] disabled:opacity-50"
          >
            {running ? "Running…" : "Run evaluation"}
          </button>
        </div>
      </section>

      {results.length > 0 ? (
        <section className="mt-10 flex flex-col gap-4">
          <h2 className="text-lg font-medium text-[#e7e9ea]">Results</h2>
          <ResultsTable results={results} activeMetrics={metricList} />

          <div className="rounded-xl border border-[#2f3336] bg-[#16181c]/50 p-5">
            <h3 className="mb-3 text-base font-medium text-[#e7e9ea]">
              LangSmith upload
            </h3>
            <p className="mb-3 text-xs text-[#71767b]">
              Creates a dataset, an experiment project linked to it, one run per
              row, and feedback scores per metric. Requires{" "}
              <code className="text-[#a8b0b7]">LANGSMITH_API_KEY</code> on the
              server.
            </p>
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex flex-1 flex-col gap-1">
                <label
                  htmlFor="exp-name"
                  className="text-sm font-medium text-[#e7e9ea]"
                >
                  Experiment name
                </label>
                <input
                  id="exp-name"
                  className="rounded-lg border border-[#2f3336] bg-[#16181c] px-3 py-2 text-sm text-[#e7e9ea] outline-none focus:border-[#1d9bf0]"
                  value={experimentName}
                  onChange={(e) => setExperimentName(e.target.value)}
                  disabled={uploading}
                />
              </div>
              <button
                type="button"
                onClick={uploadToLangSmith}
                disabled={uploading}
                className="rounded-lg border border-[#2f3336] bg-[#0f1419] px-4 py-2 text-sm font-medium text-[#e7e9ea] hover:border-[#1d9bf0] disabled:opacity-50"
              >
                {uploading ? "Uploading…" : "Upload to LangSmith"}
              </button>
            </div>
            {uploadError ? (
              <p className="text-sm text-red-400">{uploadError}</p>
            ) : null}
            {uploadSuccess ? (
              <p className="text-sm text-emerald-400">{uploadSuccess}</p>
            ) : null}
          </div>
        </section>
      ) : null}
    </main>
  );
}
