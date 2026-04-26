# LLM Evaluation Suite

Next.js app to run a fixed 10-example benchmark against any OpenRouter model, score outputs with an LLM-as-judge (`@openrouter/agent`), and upload runs to LangSmith.

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
- **Evaluator model**: independent judge model; base instructions + checkboxes for metrics (Accuracy, Relevance, Faithfulness, Coherence, Completeness, Conciseness, Tone) with live-composed system prompt preview.
- **Template Cases**: Choose from template system prompts and datasets or create your own by adding to the rows of inputs/ideal outputs.
- **Run**: streams progress (e.g. 3/10); shows a results table with per-metric % scores and pass/fail (≥70%).
- **LangSmith**: after a run, upload creates a dataset, a project linked to that dataset, one run per example (inputs, outputs, reference in `extra`), and feedback per metric.
- **Dataset file upload**: load `.json` / `.jsonl` eval rows (see **Custom dataset** above); same data flows through Run and LangSmith upload as the built-in and template samples.

## Scripts

| Command       | Description        |
| ------------- | ------------------ |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Start production   |
| `npm test` | Parser / dataset file unit tests (`tsx --test`) |

## Environment

| Variable            | Purpose                                      |
| ------------------- | -------------------------------------------- |
| `OPENROUTER_API_KEY` | Server-side calls to OpenRouter             |
| `LANGSMITH_API_KEY`  | Server-side LangSmith upload                |

Keys are read only from the environment (e.g. `.env.local` for local dev), never from client code.
