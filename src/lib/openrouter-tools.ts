import type { ActualToolCall, ToolCallSpec } from "@/types";

type OpenRouterChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
      tool_calls?: Array<{
        function?: {
          name?: string;
          arguments?: string;
        };
      }>;
    };
  }>;
  usage?: {
    cost?: number | null;
  };
};

function parseToolArguments(raw: string | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
}

export async function callModelWithTools(options: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userInput: string;
  tools: ToolCallSpec[];
}): Promise<{
  tool_calls: ActualToolCall[];
  rawText: string;
  latency_ms: number;
  cost_usd: number | null;
}> {
  const startedAt = Date.now();
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: options.model,
      messages: [
        { role: "system", content: options.systemPrompt },
        { role: "user", content: options.userInput },
      ],
      tools: options.tools,
      tool_choice: "auto",
      usage: { include: true },
    }),
  });
  const latency_ms = Date.now() - startedAt;

  const raw = (await response.json().catch(() => ({}))) as OpenRouterChatCompletionResponse & {
    error?: { message?: string };
  };
  if (!response.ok) {
    const detail =
      typeof raw?.error?.message === "string"
        ? raw.error.message
        : JSON.stringify(raw).slice(0, 400);
    throw new Error(
      `OpenRouter tool call failed (${response.status}): ${detail}`,
    );
  }

  const message = raw.choices?.[0]?.message;
  const toolCalls = (message?.tool_calls ?? [])
    .map((tc): ActualToolCall | null => {
      const name = tc.function?.name;
      if (!name) return null;
      return {
        name,
        arguments: parseToolArguments(tc.function?.arguments),
      };
    })
    .filter((call): call is ActualToolCall => call !== null);

  return {
    tool_calls: toolCalls,
    rawText: typeof message?.content === "string" ? message.content : "",
    latency_ms,
    cost_usd: raw.usage?.cost ?? null,
  };
}
