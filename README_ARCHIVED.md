# LLM Evaluation Suite

Next.js app to run a fixed 10-example benchmark against any OpenRouter model, score outputs with an LLM-as-judge (`@openrouter/agent`), and upload runs to LangSmith.

## Tool-Calling template

Select **Tool-Calling Agent (LangSmith-style)** under *Business template*. The dataset is **tool-calling rows** only: each row has `input`, a non-empty `tools` array (OpenAI-style `{ type: "function", function: { name, description, parameters } }`), and `expected_tool_calls` as an array of `{ name, arguments }` (use `[]` when no tool should be called). A deterministic scorer produces three metrics (0–100, pass ≥ 70%): **Tool Selection**, **Argument Correctness**, and **Call Trajectory**. The judge model is **not** used for these rows; the test model is called via OpenRouter `chat/completions` with `tools` and `tool_choice: "auto"`, and returned `tool_calls` are compared to the reference.

**Dataset file (JSON / JSONL):** same limits as below (1 MiB file, 200 rows, 8 KiB UTF-8 per logical field). For tool rows, the serialized JSON size of `tools` and of `expected_tool_calls` is checked separately against 8 KiB. Alias: `expected_calls` → `expected_tool_calls`. Mixed text + tool rows in one file are rejected.

**LangSmith:** uploads use `run_type: "llm"` for tool rows, `inputs: { input, tools }`, `outputs: { tool_calls, messages }` (assistant message with `tool_call` blocks for UI), and `extra.reference_outputs: { expected_tool_calls }`. Feedback keys: `metric_tool_selection`, `metric_tool_args`, `metric_tool_trajectory` (scores 0–1).

## Custom dataset (JSON / JSONL)

On the home page you can **load a dataset from a file** (`.json` or `.jsonl`) above the manual row editor. Supported shapes: a top-level array of `{ "input", "expected_output" }` rows, or an object with one of `items`, `dataset`, `data`, `examples`, or `rows` holding that array. Alias keys are normalized (e.g. `prompt` / `question` / `query` → `input`; `answer` / `reference` / `ideal` / `gold` → `expected_output`). JSONL is one JSON object per line. After parsing you get a preview and must choose **Replace current rows** or **Append** before the editor updates. Limits: **1 MiB** file size, **200** rows, **8 KiB** UTF-8 per field (enforced again on `/api/evaluate`). Files must be **UTF-8** (UTF-16 BOM is rejected). Fixtures and parser tests live under `src/lib/__fixtures__/datasets/` and `npm test`.

## Setup

```bash
npm install
cp .env.example .env.local
# Add OPENROUTER_API_KEY and LANGSMITH_API_KEY (never commit .env.local)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Features

- **Test model**: choose from live OpenRouter models; edit system prompt.
- **Evaluator model**: independent judge model for **text** datasets; base instructions + checkboxes for metrics with live-composed system prompt preview.
- **Template Cases**: Choose from template system prompts and datasets (including **Tool-Calling**) or create your own by editing rows.
- **Run**: streams progress (e.g. 3/10); shows a results table with per-metric % scores and pass/fail (≥70%).
- **LangSmith**: after a run, upload creates a dataset, a project linked to that dataset, one run per example (inputs, outputs, reference in `extra`), and feedback per metric.
- **Dataset file upload**: load `.json` / `.jsonl` eval rows (see **Custom dataset** above); same data flows through Run and LangSmith upload as the built-in and template samples.

## Scripts

| Command       | Description        |
| ------------- | ------------------ |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Start production   |
| `npm test` | Parser, tool scorer, and tool-eval unit tests (`tsx --test`) |

## Environment

| Variable            | Purpose                                      |
| ------------------- | -------------------------------------------- |
| `OPENROUTER_API_KEY` | Server-side calls to OpenRouter             |
| `LANGSMITH_API_KEY`  | Server-side LangSmith upload                |

Keys are read only from the environment (e.g. `.env.local` for local dev), never from client code.
