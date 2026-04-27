import type {
  EvalItem,
  ExpectedToolCall,
  ToolCallEvalItem,
  ToolCallSpec,
} from "@/types";

/** Max upload size (bytes). Enforced in UI before read; documented for API body limits. */
export const DATASET_MAX_FILE_BYTES = 1 * 1024 * 1024;

export const DATASET_MAX_ROWS = 200;

/** Per-field UTF-8 byte length cap after coercion + trim. */
export const DATASET_MAX_FIELD_BYTES = 8 * 1024;

const INPUT_KEY_ORDER = [
  "input",
  "prompt",
  "question",
  "query",
  "user",
  "user_message",
] as const;

const EXPECTED_KEY_ORDER = [
  "expected_output",
  "expected",
  "output",
  "reference",
  "answer",
  "ideal",
  "ground_truth",
  "gold",
] as const;

export type ParseResult =
  | {
      ok: true;
      items: EvalItem[];
      warnings: string[];
      droppedEmpty: number;
      duplicatesCollapsed: number;
      successSummary: string;
    }
  | { ok: false; error: string; rowIndex?: number };

function stripBom(text: string): string {
  return text.replace(/^\uFEFF/, "");
}

/** Reject UTF-16 BOM before UTF-8 decode of raw bytes (browser / Node). */
export function decodeDatasetFileToUtf8Text(
  buffer: ArrayBuffer,
): { ok: true; text: string } | { ok: false; error: string } {
  const u = new Uint8Array(buffer);
  if (u.length >= 2) {
    if (
      (u[0] === 0xff && u[1] === 0xfe) ||
      (u[0] === 0xfe && u[1] === 0xff)
    ) {
      return { ok: false, error: "File must be UTF-8 encoded." };
    }
  }
  const text = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
  return { ok: true, text: stripBom(text) };
}

function utf8ByteLength(s: string): number {
  return new TextEncoder().encode(s).length;
}

function unwrapRows(parsed: unknown): unknown[] | ParseResult {
  if (Array.isArray(parsed)) return parsed;
  if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
    const o = parsed as Record<string, unknown>;
    const keys = ["items", "dataset", "data", "examples", "rows"] as const;
    for (const k of keys) {
      if (k in o && Array.isArray(o[k])) return o[k] as unknown[];
    }
  }
  return {
    ok: false,
    error:
      "Expected an array of rows or an object with an 'items'/'dataset'/'data' array.",
  };
}

/** Parse newline-delimited JSON. Used for `.jsonl` or as fallback after whole-file JSON fails. */
function parseJsonlToRows(
  text: string,
  reportLineErrors: boolean,
): unknown[] | ParseResult {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    return { ok: false, error: "Could not parse file as JSON or JSONL." };
  }
  const rows: unknown[] = [];
  for (let i = 0; i < lines.length; i++) {
    try {
      rows.push(JSON.parse(lines[i]!));
    } catch {
      if (reportLineErrors) {
        return {
          ok: false,
          error: `Line ${i + 1}: invalid JSON.`,
        };
      }
      return { ok: false, error: "Could not parse file as JSON or JSONL." };
    }
  }
  return rows;
}

function firstNonWhitespace(text: string): string {
  const m = text.match(/\S/);
  return m ? m[0]! : "";
}

function parseTopLevelJsonOrJsonl(
  text: string,
  filename: string,
): unknown[] | ParseResult {
  const lower = filename.toLowerCase();
  const isJsonl = lower.endsWith(".jsonl");

  if (isJsonl) {
    return parseJsonlToRows(text, true);
  }

  const trimmed = text.trim();
  const first = firstNonWhitespace(text);

  const tryWholeJson = (): unknown[] | ParseResult => {
    try {
      const parsed = JSON.parse(trimmed);
      const unwrapped = unwrapRows(parsed);
      if (Array.isArray(unwrapped)) return unwrapped;
      return unwrapped;
    } catch {
      const jl = parseJsonlToRows(text, false);
      if (Array.isArray(jl)) return jl;
      return { ok: false, error: "Could not parse file as JSON or JSONL." };
    }
  };

  if (first === "{" || first === "[") {
    return tryWholeJson();
  }

  return tryWholeJson();
}

type FieldPick =
  | { pick: "ok"; value: string }
  | { pick: "err"; error: string; rowIndex?: number };

function pickInput(row: Record<string, unknown>, rowIndex1: number): FieldPick {
  let pickedKey: string | null = null;
  let picked: unknown = undefined;
  for (const key of INPUT_KEY_ORDER) {
    if (Object.prototype.hasOwnProperty.call(row, key)) {
      pickedKey = key;
      picked = row[key];
      break;
    }
  }
  if (pickedKey === null) {
    return {
      pick: "err",
      error: `Row ${rowIndex1}: missing 'input' (or alias).`,
      rowIndex: rowIndex1,
    };
  }
  if (picked === null || picked === undefined) {
    return {
      pick: "err",
      error: `Row ${rowIndex1}: 'input' must be a string, number, or boolean.`,
      rowIndex: rowIndex1,
    };
  }
  if (typeof picked === "object") {
    return {
      pick: "err",
      error: `Row ${rowIndex1}: 'input' must be a string, number, or boolean.`,
      rowIndex: rowIndex1,
    };
  }
  if (typeof picked !== "string" && typeof picked !== "number" && typeof picked !== "boolean") {
    return {
      pick: "err",
      error: `Row ${rowIndex1}: 'input' must be a string, number, or boolean.`,
      rowIndex: rowIndex1,
    };
  }
  return { pick: "ok", value: String(picked).trim() };
}

function pickExpected(row: Record<string, unknown>, rowIndex1: number): FieldPick {
  let picked: unknown = undefined;
  let found = false;
  for (const key of EXPECTED_KEY_ORDER) {
    if (Object.prototype.hasOwnProperty.call(row, key)) {
      picked = row[key];
      found = true;
      break;
    }
  }
  if (!found) {
    return { pick: "ok", value: "" };
  }
  if (picked === null || picked === undefined) {
    return { pick: "ok", value: "" };
  }
  if (typeof picked === "object") {
    return {
      pick: "err",
      error: `Row ${rowIndex1}: 'expected_output' must be a string, number, boolean, or null.`,
      rowIndex: rowIndex1,
    };
  }
  if (typeof picked !== "string" && typeof picked !== "number" && typeof picked !== "boolean") {
    return {
      pick: "err",
      error: `Row ${rowIndex1}: 'expected_output' must be a string, number, boolean, or null.`,
      rowIndex: rowIndex1,
    };
  }
  return { pick: "ok", value: String(picked).trim() };
}

type ToolPick =
  | { pick: "ok"; tools: ToolCallSpec[] }
  | { pick: "err"; error: string; rowIndex?: number };

type ExpectedCallsPick =
  | { pick: "ok"; expectedToolCalls: ExpectedToolCall[] }
  | { pick: "err"; error: string; rowIndex?: number };

type DatasetKind = "text" | "tool_call";

function hasOwn(obj: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function inferRowKind(row: Record<string, unknown>): DatasetKind {
  if (
    hasOwn(row, "tools") ||
    hasOwn(row, "expected_tool_calls") ||
    hasOwn(row, "expected_calls")
  ) {
    return "tool_call";
  }
  return "text";
}

function pickTools(row: Record<string, unknown>, rowIndex1: number): ToolPick {
  if (!hasOwn(row, "tools")) {
    return {
      pick: "err",
      error: `Row ${rowIndex1}: missing required 'tools' field for tool-calling datasets.`,
      rowIndex: rowIndex1,
    };
  }
  const rawTools = row.tools;
  if (!Array.isArray(rawTools) || rawTools.length === 0) {
    return {
      pick: "err",
      error: `Row ${rowIndex1}: 'tools' must be a non-empty array.`,
      rowIndex: rowIndex1,
    };
  }

  const tools: ToolCallSpec[] = [];
  for (let i = 0; i < rawTools.length; i++) {
    const raw = rawTools[i];
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return {
        pick: "err",
        error: `Row ${rowIndex1}: tools[${i}] must be an object.`,
        rowIndex: rowIndex1,
      };
    }
    const tool = raw as Record<string, unknown>;
    if (tool.type !== "function") {
      return {
        pick: "err",
        error: `Row ${rowIndex1}: tools[${i}].type must be "function".`,
        rowIndex: rowIndex1,
      };
    }
    const f = tool.function;
    if (!f || typeof f !== "object" || Array.isArray(f)) {
      return {
        pick: "err",
        error: `Row ${rowIndex1}: tools[${i}].function must be an object.`,
        rowIndex: rowIndex1,
      };
    }
    const fn = f as Record<string, unknown>;
    if (typeof fn.name !== "string" || fn.name.trim() === "") {
      return {
        pick: "err",
        error: `Row ${rowIndex1}: tools[${i}].function.name must be a non-empty string.`,
        rowIndex: rowIndex1,
      };
    }
    if (typeof fn.description !== "string") {
      return {
        pick: "err",
        error: `Row ${rowIndex1}: tools[${i}].function.description must be a string.`,
        rowIndex: rowIndex1,
      };
    }
    if (
      !fn.parameters ||
      typeof fn.parameters !== "object" ||
      Array.isArray(fn.parameters)
    ) {
      return {
        pick: "err",
        error: `Row ${rowIndex1}: tools[${i}].function.parameters must be an object.`,
        rowIndex: rowIndex1,
      };
    }

    tools.push({
      type: "function",
      function: {
        name: fn.name.trim(),
        description: fn.description,
        parameters: fn.parameters as Record<string, unknown>,
      },
    });
  }
  return { pick: "ok", tools };
}

function pickExpectedToolCalls(
  row: Record<string, unknown>,
  rowIndex1: number,
): ExpectedCallsPick {
  const key = hasOwn(row, "expected_tool_calls")
    ? "expected_tool_calls"
    : hasOwn(row, "expected_calls")
      ? "expected_calls"
      : null;
  if (!key) {
    return {
      pick: "err",
      error: `Row ${rowIndex1}: missing required 'expected_tool_calls' field for tool-calling datasets.`,
      rowIndex: rowIndex1,
    };
  }

  const rawCalls = row[key];
  if (!Array.isArray(rawCalls)) {
    return {
      pick: "err",
      error: `Row ${rowIndex1}: 'expected_tool_calls' must be an array.`,
      rowIndex: rowIndex1,
    };
  }

  const expectedToolCalls: ExpectedToolCall[] = [];
  for (let i = 0; i < rawCalls.length; i++) {
    const raw = rawCalls[i];
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return {
        pick: "err",
        error: `Row ${rowIndex1}: expected_tool_calls[${i}] must be an object.`,
        rowIndex: rowIndex1,
      };
    }
    const call = raw as Record<string, unknown>;
    if (typeof call.name !== "string" || call.name.trim() === "") {
      return {
        pick: "err",
        error: `Row ${rowIndex1}: expected_tool_calls[${i}].name must be a non-empty string.`,
        rowIndex: rowIndex1,
      };
    }
    if (
      !call.arguments ||
      typeof call.arguments !== "object" ||
      Array.isArray(call.arguments)
    ) {
      return {
        pick: "err",
        error: `Row ${rowIndex1}: expected_tool_calls[${i}].arguments must be an object.`,
        rowIndex: rowIndex1,
      };
    }

    expectedToolCalls.push({
      name: call.name.trim(),
      arguments: call.arguments as Record<string, unknown>,
    });
  }

  return { pick: "ok", expectedToolCalls };
}

function summarizeExpectedToolCalls(expectedToolCalls: ExpectedToolCall[]): string {
  if (expectedToolCalls.length === 0) return "(no tool)";
  return `[tool_call] ${expectedToolCalls.map((c) => c.name).join(", ")}`;
}

function checkFieldLengths(
  items: EvalItem[],
): ParseResult | null {
  for (let i = 0; i < items.length; i++) {
    const row = items[i]!;
    if (utf8ByteLength(row.input) > DATASET_MAX_FIELD_BYTES) {
      return {
        ok: false,
        error: `Row ${i + 1}: field exceeds 8 KiB.`,
        rowIndex: i + 1,
      };
    }
    if (utf8ByteLength(row.expected_output) > DATASET_MAX_FIELD_BYTES) {
      return {
        ok: false,
        error: `Row ${i + 1}: field exceeds 8 KiB.`,
        rowIndex: i + 1,
      };
    }
    if (row.kind === "tool_call") {
      const toolsBytes = utf8ByteLength(JSON.stringify(row.tools));
      if (toolsBytes > DATASET_MAX_FIELD_BYTES) {
        return {
          ok: false,
          error: `Row ${i + 1}: 'tools' JSON exceeds 8 KiB.`,
          rowIndex: i + 1,
        };
      }
      const expectedCallsBytes = utf8ByteLength(
        JSON.stringify(row.expected_tool_calls),
      );
      if (expectedCallsBytes > DATASET_MAX_FIELD_BYTES) {
        return {
          ok: false,
          error: `Row ${i + 1}: 'expected_tool_calls' JSON exceeds 8 KiB.`,
          rowIndex: i + 1,
        };
      }
    }
  }
  return null;
}

function isSameRow(a: EvalItem, b: EvalItem): boolean {
  if (a.kind !== b.kind) return false;
  if (a.input !== b.input || a.expected_output !== b.expected_output) return false;
  if (a.kind !== "tool_call" || b.kind !== "tool_call") return true;
  return (
    JSON.stringify(a.tools) === JSON.stringify(b.tools) &&
    JSON.stringify(a.expected_tool_calls) === JSON.stringify(b.expected_tool_calls) &&
    (a.notes ?? "") === (b.notes ?? "")
  );
}

function collapseConsecutiveDuplicates(items: EvalItem[]): {
  next: EvalItem[];
  collapsed: number;
} {
  if (items.length === 0) return { next: [], collapsed: 0 };
  const next: EvalItem[] = [items[0]!];
  let collapsed = 0;
  for (let i = 1; i < items.length; i++) {
    const cur = items[i]!;
    const prev = next[next.length - 1]!;
    if (isSameRow(cur, prev)) {
      collapsed++;
    } else {
      next.push(cur);
    }
  }
  return { next, collapsed };
}

/**
 * Parse and normalize dataset file contents (UTF-8 text, BOM stripped by caller or here).
 * Does not enforce file byte size — use `file.size` in the UI before reading.
 */
export function parseDatasetFile(text: string, filename: string): ParseResult {
  const normalized = stripBom(text);
  const rawRows = parseTopLevelJsonOrJsonl(normalized, filename);
  if (!Array.isArray(rawRows)) {
    return rawRows;
  }

  if (rawRows.length === 0) {
    return {
      ok: false,
      error: "Dataset file contains no rows.",
    };
  }

  const items: EvalItem[] = [];
  let droppedEmpty = 0;
  let datasetKind: DatasetKind | null = null;

  for (let i = 0; i < rawRows.length; i++) {
    const rowIndex1 = i + 1;
    const raw = rawRows[i];
    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
      return {
        ok: false,
        error: `Row ${rowIndex1}: each row must be a JSON object.`,
        rowIndex: rowIndex1,
      };
    }
    const row = raw as Record<string, unknown>;
    const rowKind = inferRowKind(row);
    if (datasetKind === null) {
      datasetKind = rowKind;
    } else if (datasetKind !== rowKind) {
      return {
        ok: false,
        error:
          "Mixed-kind dataset: all rows must be text rows or tool-calling rows.",
        rowIndex: rowIndex1,
      };
    }

    const inputRes = pickInput(row, rowIndex1);
    if (inputRes.pick === "err") {
      return { ok: false, error: inputRes.error, rowIndex: inputRes.rowIndex };
    }

    if (inputRes.value === "") {
      droppedEmpty++;
      continue;
    }

    if (rowKind === "tool_call") {
      const toolsRes = pickTools(row, rowIndex1);
      if (toolsRes.pick === "err") {
        return {
          ok: false,
          error: toolsRes.error,
          rowIndex: toolsRes.rowIndex,
        };
      }
      const expectedCallsRes = pickExpectedToolCalls(row, rowIndex1);
      if (expectedCallsRes.pick === "err") {
        return {
          ok: false,
          error: expectedCallsRes.error,
          rowIndex: expectedCallsRes.rowIndex,
        };
      }
      const notesRaw = row.notes;
      const notes =
        typeof notesRaw === "string" && notesRaw.trim().length > 0
          ? notesRaw.trim()
          : undefined;

      const item: ToolCallEvalItem = {
        kind: "tool_call",
        input: inputRes.value,
        tools: toolsRes.tools,
        expected_tool_calls: expectedCallsRes.expectedToolCalls,
        notes,
        expected_output: summarizeExpectedToolCalls(
          expectedCallsRes.expectedToolCalls,
        ),
      };
      items.push(item);
    } else {
      const expRes = pickExpected(row, rowIndex1);
      if (expRes.pick === "err") {
        return { ok: false, error: expRes.error, rowIndex: expRes.rowIndex };
      }
      items.push({
        kind: "text",
        input: inputRes.value,
        expected_output: expRes.value,
      });
    }
  }

  if (items.length === 0) {
    return {
      ok: false,
      error:
        "No valid rows: every row had an empty input (after trim).",
    };
  }

  if (items.length > DATASET_MAX_ROWS) {
    return {
      ok: false,
      error: `Too many rows: ${items.length}. Max ${DATASET_MAX_ROWS}.`,
    };
  }

  const lenErr = checkFieldLengths(items);
  if (lenErr) return lenErr;

  const { next: deduped, collapsed } = collapseConsecutiveDuplicates(items);
  const lenErr2 = checkFieldLengths(deduped);
  if (lenErr2) return lenErr2;

  const emptyRefCount = deduped.filter((r) => r.expected_output === "").length;
  const warnings: string[] = [];
  if (emptyRefCount > 0) {
    warnings.push(
      `${emptyRefCount} row(s) have empty reference output.`,
    );
  }
  if (collapsed > 0) {
    warnings.push(`Collapsed ${collapsed} consecutive duplicate row(s).`);
  }

  const k = deduped.length;
  const successSummary = `Loaded ${k} rows (${droppedEmpty} empty rows dropped, ${collapsed} duplicates collapsed).`;

  return {
    ok: true,
    items: deduped,
    warnings,
    droppedEmpty,
    duplicatesCollapsed: collapsed,
    successSummary,
  };
}
