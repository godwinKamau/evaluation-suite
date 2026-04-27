import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runToolCallEvalForItem } from "./run-tool-call-eval";
import type { ToolCallEvalItem } from "@/types";
import { TOOL_METRIC_KEYS } from "@/types";

describe("runToolCallEvalForItem", () => {
  it("scores using mocked tool invocation (no network)", async () => {
    const item: ToolCallEvalItem = {
      kind: "tool_call",
      input: "weather in Paris",
      tools: [
        {
          type: "function",
          function: {
            name: "get_weather",
            description: "x",
            parameters: { type: "object", properties: {} },
          },
        },
      ],
      expected_tool_calls: [
        { name: "get_weather", arguments: { city: "Paris" } },
      ],
      expected_output: "[tool_call] get_weather",
    };

    const result = await runToolCallEvalForItem(
      0,
      item,
      {
        testModel: "mock",
        testSystemPrompt: "sys",
        apiKey: "test-key",
        activeMetrics: [...TOOL_METRIC_KEYS],
      },
      {
        invokeTools: async () => ({
          tool_calls: [{ name: "get_weather", arguments: { city: "Paris" } }],
          rawText: "",
          latency_ms: 123,
          cost_usd: 0.00042,
        }),
      },
    );

    assert.equal(result.kind, "tool_call");
    assert.equal(result.metrics.tool_selection?.score, 100);
    assert.equal(result.metrics.tool_args?.score, 100);
    assert.equal(result.metrics.tool_trajectory?.score, 100);
    assert.ok(result.actual_output.includes("get_weather"));
    assert.equal(result.latency_ms, 123);
    assert.equal(result.cost_usd, 0.00042);
  });
});
