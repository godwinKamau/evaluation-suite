# LLM Evaluation Suite

Next.js app to run a fixed 10-example benchmark against any OpenRouter model, score outputs with an LLM-as-judge (`@openrouter/agent`), and upload runs to LangSmith.

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
- **Run**: streams progress (e.g. 3/10); shows a results table with per-metric % scores and pass/fail (≥70%).
- **LangSmith**: after a run, upload creates a dataset, a project linked to that dataset, one run per example (inputs, outputs, reference in `extra`), and feedback per metric.

## Scripts

| Command       | Description        |
| ------------- | ------------------ |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Start production   |

## Environment

| Variable            | Purpose                                      |
| ------------------- | -------------------------------------------- |
| `OPENROUTER_API_KEY` | Server-side calls to OpenRouter             |
| `LANGSMITH_API_KEY`  | Server-side LangSmith upload                |

Keys are read only from the environment (e.g. `.env.local` for local dev), never from client code.
