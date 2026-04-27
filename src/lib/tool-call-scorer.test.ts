import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { scoreToolCalls } from "./tool-call-scorer";

describe("scoreToolCalls", () => {
  it("exact match single tool", () => {
    const expected = [{ name: "get_weather", arguments: { city: "Paris" } }];
    const actual = [{ name: "get_weather", arguments: { city: "Paris" } }];
    const scores = scoreToolCalls(expected, actual);
    assert.equal(scores.tool_selection.score, 100);
    assert.equal(scores.tool_args.score, 100);
    assert.equal(scores.tool_trajectory.score, 100);
  });

  it("missing tool call", () => {
    const expected = [{ name: "get_weather", arguments: { city: "Paris" } }];
    const scores = scoreToolCalls(expected, []);
    assert.equal(scores.tool_selection.score, 0);
    assert.equal(scores.tool_args.score, 0);
    assert.equal(scores.tool_trajectory.score, 0);
  });

  it("extra tool call penalizes selection and trajectory", () => {
    const expected = [{ name: "get_weather", arguments: { city: "Paris" } }];
    const actual = [
      { name: "get_weather", arguments: { city: "Paris" } },
      { name: "search_orders", arguments: { order_id: "A-1" } },
    ];
    const scores = scoreToolCalls(expected, actual);
    assert.equal(scores.tool_selection.score, 0);
    assert.equal(scores.tool_args.score, 100);
    assert.equal(scores.tool_trajectory.score, 50);
  });

  it("swapped order keeps selection but fails trajectory", () => {
    const expected = [
      { name: "search_orders", arguments: { order_id: "ORD-1" } },
      { name: "get_weather", arguments: { city: "London" } },
    ];
    const actual = [
      { name: "get_weather", arguments: { city: "London" } },
      { name: "search_orders", arguments: { order_id: "ORD-1" } },
    ];
    const scores = scoreToolCalls(expected, actual);
    assert.equal(scores.tool_selection.score, 100);
    assert.equal(scores.tool_args.score, 100);
    assert.equal(scores.tool_trajectory.score, 0);
  });

  it("numeric tolerance accepts very small deltas", () => {
    const expected = [
      { name: "set_amount", arguments: { amount: 1.0000005 } },
    ];
    const actual = [{ name: "set_amount", arguments: { amount: 1.000001 } }];
    const scores = scoreToolCalls(expected, actual);
    assert.equal(scores.tool_args.score, 100);
  });

  it("numeric value outside tolerance fails arg match", () => {
    const expected = [{ name: "set_amount", arguments: { amount: 1 } }];
    const actual = [{ name: "set_amount", arguments: { amount: 1.1 } }];
    const scores = scoreToolCalls(expected, actual);
    assert.equal(scores.tool_args.score, 0);
  });

  it("missing optional arg is not penalized when not expected", () => {
    const expected = [{ name: "get_weather", arguments: { city: "Tokyo" } }];
    const actual = [
      { name: "get_weather", arguments: { city: "Tokyo", unit: "celsius" } },
    ];
    const scores = scoreToolCalls(expected, actual);
    assert.equal(scores.tool_args.score, 100);
  });

  it("type mismatch string vs number fails when non-coercible", () => {
    const expected = [
      { name: "create_calendar_event", arguments: { duration_minutes: 30 } },
    ];
    const actual = [
      {
        name: "create_calendar_event",
        arguments: { duration_minutes: "thirty" },
      },
    ];
    const scores = scoreToolCalls(expected, actual);
    assert.equal(scores.tool_args.score, 0);
  });

  it("no tool needed case passes when both empty", () => {
    const scores = scoreToolCalls([], []);
    assert.equal(scores.tool_selection.score, 100);
    assert.equal(scores.tool_args.score, 100);
    assert.equal(scores.tool_trajectory.score, 100);
  });

  it("no tool needed fails when actual has call", () => {
    const scores = scoreToolCalls([], [
      { name: "get_weather", arguments: { city: "Paris" } },
    ]);
    assert.equal(scores.tool_selection.score, 0);
    assert.equal(scores.tool_trajectory.score, 0);
  });

  it("numeric string is coerced to number for comparison", () => {
    const expected = [
      {
        name: "create_calendar_event",
        arguments: { duration_minutes: 30 },
      },
    ];
    const actual = [
      {
        name: "create_calendar_event",
        arguments: { duration_minutes: "30" },
      },
    ];
    const scores = scoreToolCalls(expected, actual);
    assert.equal(scores.tool_args.score, 100);
  });
});
