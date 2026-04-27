import {
  PASS_THRESHOLD_PERCENT,
  type ActualToolCall,
  type ExpectedToolCall,
  type MetricScore,
} from "@/types";

const NUMERIC_TOLERANCE = 1e-6;

function clampScore(score: number): number {
  if (score < 0) return 0;
  if (score > 100) return 100;
  return Math.round(score);
}

function metric(score: number, reasoning: string): MetricScore {
  const normalized = clampScore(score);
  return {
    score: normalized,
    reasoning,
    passed: normalized >= PASS_THRESHOLD_PERCENT,
  };
}

function toSortedValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(toSortedValue);
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(
      ([a], [b]) => a.localeCompare(b),
    );
    const out: Record<string, unknown> = {};
    for (const [k, v] of entries) {
      out[k] = toSortedValue(v);
    }
    return out;
  }
  return value;
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(toSortedValue(value));
}

function tryParseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function valuesMatch(expected: unknown, actual: unknown): boolean {
  const expectedNum = tryParseNumber(expected);
  const actualNum = tryParseNumber(actual);
  if (expectedNum !== null && actualNum !== null) {
    return Math.abs(expectedNum - actualNum) <= NUMERIC_TOLERANCE;
  }
  return canonicalJson(expected) === canonicalJson(actual);
}

function compareArgs(
  expectedArgs: Record<string, unknown>,
  actualArgs: Record<string, unknown>,
): { score: number; diffs: string[] } {
  const expectedEntries = Object.entries(expectedArgs);
  if (expectedEntries.length === 0) {
    return { score: 100, diffs: [] };
  }

  let matched = 0;
  const diffs: string[] = [];
  for (const [key, expectedValue] of expectedEntries) {
    if (!(key in actualArgs)) {
      diffs.push(`missing arg "${key}"`);
      continue;
    }
    const actualValue = actualArgs[key];
    if (valuesMatch(expectedValue, actualValue)) {
      matched++;
    } else {
      diffs.push(
        `arg "${key}" mismatch (expected ${canonicalJson(expectedValue)} got ${canonicalJson(actualValue)})`,
      );
    }
  }

  const score = (matched / expectedEntries.length) * 100;
  return { score: clampScore(score), diffs };
}

function getNames(calls: Array<{ name: string }>): string {
  if (calls.length === 0) return "(none)";
  return calls.map((c) => c.name).join(", ");
}

function popFirstByName<T extends { name: string }>(
  arr: T[],
  name: string,
): T | null {
  const idx = arr.findIndex((item) => item.name === name);
  if (idx === -1) return null;
  const [item] = arr.splice(idx, 1);
  return item ?? null;
}

export function scoreToolCalls(
  expected: ExpectedToolCall[],
  actual: ActualToolCall[],
): {
  tool_selection: MetricScore;
  tool_args: MetricScore;
  tool_trajectory: MetricScore;
} {
  let toolSelection: MetricScore;
  if (expected.length === 0 && actual.length === 0) {
    toolSelection = metric(100, "No tool expected and none was called.");
  } else if (expected.length === 0) {
    toolSelection = metric(
      0,
      `No tool expected, but model called: ${getNames(actual)}.`,
    );
  } else if (actual.length === 0) {
    toolSelection = metric(
      0,
      `Expected tool call(s): ${getNames(expected)}. Model made no tool calls.`,
    );
  } else {
    const remainingActual = [...actual];
    let matched = 0;
    for (const exp of expected) {
      const found = popFirstByName(remainingActual, exp.name);
      if (found) matched++;
    }
    const extra = Math.max(0, actual.length - expected.length);
    const base = (matched / expected.length) * 100;
    const penaltyPerExtra = 100 / expected.length;
    const score = clampScore(base - extra * penaltyPerExtra);
    const missingNames = expected
      .filter(
        (exp) => !actual.some((act) => act.name === exp.name),
      )
      .map((x) => x.name);
    const reason = [
      `Expected: ${getNames(expected)}.`,
      `Actual: ${getNames(actual)}.`,
      missingNames.length > 0
        ? `Missing tool(s): ${missingNames.join(", ")}.`
        : "All expected tool names were present.",
      extra > 0 ? `Extra tool call count: ${extra}.` : "No extra tool calls.",
    ].join(" ");
    toolSelection = metric(score, reason);
  }

  let toolArgs: MetricScore;
  if (expected.length === 0) {
    toolArgs = metric(100, "No expected tool arguments to evaluate.");
  } else {
    const remainingActual = [...actual];
    const pairScores: number[] = [];
    const pairDiffs: string[] = [];
    for (const exp of expected) {
      const act = popFirstByName(remainingActual, exp.name);
      if (!act) {
        pairScores.push(0);
        pairDiffs.push(
          `tool "${exp.name}" missing; could not compare arguments.`,
        );
        continue;
      }
      const compared = compareArgs(exp.arguments, act.arguments);
      pairScores.push(compared.score);
      if (compared.diffs.length > 0) {
        pairDiffs.push(`${exp.name}: ${compared.diffs.join("; ")}`);
      }
    }
    const avg =
      pairScores.length === 0
        ? 0
        : pairScores.reduce((sum, s) => sum + s, 0) / pairScores.length;
    toolArgs = metric(
      avg,
      pairDiffs.length > 0
        ? `Argument differences: ${pairDiffs.join(" | ")}`
        : "All matched tool arguments are correct.",
    );
  }

  let toolTrajectory: MetricScore;
  if (expected.length === 0 && actual.length === 0) {
    toolTrajectory = metric(100, "No trajectory expected and none was produced.");
  } else if (expected.length === 0 || actual.length === 0) {
    toolTrajectory = metric(
      0,
      expected.length === 0
        ? `No calls expected, but actual call count is ${actual.length}.`
        : `Expected ${expected.length} call(s), but model produced none.`,
    );
  } else {
    const overlap = Math.min(expected.length, actual.length);
    let positionalMatches = 0;
    const mismatches: string[] = [];
    for (let i = 0; i < overlap; i++) {
      if (expected[i]?.name === actual[i]?.name) {
        positionalMatches++;
      } else {
        mismatches.push(
          `step ${i + 1}: expected "${expected[i]?.name}" got "${actual[i]?.name}"`,
        );
      }
    }
    const extra = Math.max(0, actual.length - expected.length);
    const missing = Math.max(0, expected.length - actual.length);
    const base = (positionalMatches / expected.length) * 100;
    const penalty = (extra / expected.length) * 50;
    const score = clampScore(base - penalty);
    const reason = [
      mismatches.length > 0
        ? `Order mismatch: ${mismatches.join("; ")}.`
        : "Order matched for overlapping steps.",
      extra > 0 ? `Extra trailing calls: ${extra}.` : "No extra trailing calls.",
      missing > 0 ? `Missing trailing calls: ${missing}.` : "No missing trailing calls.",
    ].join(" ");
    toolTrajectory = metric(score, reason);
  }

  return {
    tool_selection: toolSelection,
    tool_args: toolArgs,
    tool_trajectory: toolTrajectory,
  };
}
