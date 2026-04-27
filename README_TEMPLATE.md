# LLM Evaluation Suite

## The Problem
[On June 15th, Anthropic is sunsetting Sonnet and Opus!](https://www.mindstudio.ai/blog/claude-sonnet-4-opus-4-deprecation-migration-guide) Well, maybe not *all* of Sonnet and Opus, but a lot of projects that started with versions 4.0 are going to need to migrate to a newer version or take this moment to explore the latest innovations and change models altogether.

## The Solution
This LLM evaluation suite provides users a means to rapidly test new models for their projects with ease of use, using LLM-as-Judge to evaluate LLM outputs.

## AI integration
This app uses OpenRouter as a harness, allowing the user to test over 100 model versions over a dataset of your choice. Built for customizability, users choose the LLM to test, the evaluator, and the dataset to test on. On top of that, users can rewrite the template system prompts and datasets to fit the needs of their project.

On top of this