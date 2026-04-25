import type { EvalItem } from "@/types";

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
  }
  return null;
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
    if (cur.input === prev.input && cur.expected_output === prev.expected_output) {
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
    const inputRes = pickInput(row, rowIndex1);
    if (inputRes.pick === "err") {
      return { ok: false, error: inputRes.error, rowIndex: inputRes.rowIndex };
    }
    const expRes = pickExpected(row, rowIndex1);
    if (expRes.pick === "err") {
      return { ok: false, error: expRes.error, rowIndex: expRes.rowIndex };
    }

    if (inputRes.value === "") {
      droppedEmpty++;
      continue;
    }
    items.push({
      input: inputRes.value,
      expected_output: expRes.value,
    });
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
      `${emptyRefCount} row(s) have empty reference output — judge will score against an empty reference.`,
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
