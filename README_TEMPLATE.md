# LLM Evaluation Suite

## The Problem
Teams evaluating LLMs for internal tools — support routing, knowledge retrieval, ticket triage — face a recurring problem: there is no fast, structured way to compare model quality across the dimensions that matter for their specific use case. Generic benchmarks measure academic tasks, not business ones. Running ad-hoc comparisons in a playground produces no reproducible record.
The people most affected are AI platform and tooling teams (like Klaviyo's ARIA team) who need to make confident, defensible decisions about which model to deploy for a given workflow — and then track whether that decision holds up over time as models change.
Success looks like: a team can define a realistic task, run a structured comparison across 2–3 candidate models in under 10 minutes, get per-dimension quality scores with cost data, and have the results logged to LangSmith for reproducibility. The decision artifact is the output, not just the answer.

## The Solution
LLM Evaluation Suite is a Next.js web app that lets you benchmark any model on a task you define, score outputs with an independent LLM-as-judge across 7 quality dimensions, and upload runs to LangSmith for traceability.

### Key Features
- Model selection from live OpenRouter catalog with editable system prompt
- Independent evaluator model with configurable metrics: Accuracy, Relevance, Faithfulness, Coherence, Completeness, Conciseness, Tone
- Streaming run progress with a per-example results table showing metric scores and pass/fail (≥70% threshold)
- Custom dataset loading via .json or .jsonl file upload (up to 200 rows)
- Per-example token usage and cost tracking surfaced in the results table
- LangSmith integration: auto-creates a dataset, project, and run per example with feedback per metric
- Agentic tool-use evaluation via a mock internal knowledge base (search_knowledge_base, lookup_ticket, get_user_profile)

*The evaluation itself is AI-powered: a separate judge model scores each output, enabling automated quality assessment at scale. Without the LLM-as-judge pattern, this would require expensive human review for every run.*

## AI integration
**Models & APIs**
- OpenRouter API for model-under-test: abstracts access to GPT-4o, Claude, Mistral, Llama, and others behind a single endpoint
- @openrouter/auto as the default evaluator judge — can be swapped for any model via the UI
- LangSmith SDK for run logging, feedback upload, and dataset management

**Patterns Used**
- LLM-as-judge: a second model scores each output independently, reducing human review burden
- Tool use evaluation: the model-under-test can call mock internal tools (knowledge base search, ticket lookup) and is scored on tool selection accuracy and argument quality
- Configurable metric system: evaluator system prompt is composed dynamically from checkbox selections, giving teams control over what dimensions matter for their task

**Tradeoffs**
- Cost vs. coverage: running two LLMs per example (test + judge) doubles inference cost. Surfacing per-run cost in the UI makes this tradeoff visible and manageable.
- Judge reliability: LLM-as-judge has known biases (verbosity preference, position bias). Mitigation: the judge model is kept independent from the test model and scores are shown per-metric rather than as a single score.
- Latency: streaming progress (N/10) keeps the UI responsive during longer runs.

**Where AI exceeded expectations:** the judge model proved consistent on Faithfulness and Accuracy with minimal prompt tuning. 
**Where it falls short:** Conciseness scoring was noisy, often different evaluators scored this variably.

## Architecture/Design Decisions

Stack
- Next.js (App Router) — frontend and API routes in one repo, easy Vercel deploy
- OpenRouter — single API key gives access to the full model catalog, avoiding per-provider key management
- LangSmith — chosen over custom logging because it provides a purpose-built UI for run comparison, feedback aggregation, and dataset versioning
Data Flow
User selects model + metrics → defines or uploads test dataset → /api/evaluate streams responses example-by-example → each output is scored by the judge model → results table updates live → user triggers LangSmith upload via /api/langsmith.