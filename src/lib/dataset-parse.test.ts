import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  DATASET_MAX_FIELD_BYTES,
  decodeDatasetFileToUtf8Text,
  parseDatasetFile,
} from "./dataset-parse";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) =>
  readFileSync(join(__dirname, "__fixtures__/datasets", name));

function readUtf8(name: string): string {
  return fixture(name).toString("utf8");
}

describe("parseDatasetFile", () => {
  it("parses canonical.json", () => {
    const r = parseDatasetFile(readUtf8("canonical.json"), "canonical.json");
    assert(r.ok);
    assert.equal(r.items.length, 3);
    assert.equal(r.items[0]!.input, "One");
    assert.equal(r.droppedEmpty, 0);
    assert.equal(r.duplicatesCollapsed, 0);
  });

  it("parses wrapped-items.json", () => {
    const r = parseDatasetFile(readUtf8("wrapped-items.json"), "wrapped-items.json");
    assert(r.ok);
    assert.equal(r.items.length, 3);
    assert.equal(r.items[0]!.input, "A");
  });

  it("parses wrapped-data.json", () => {
    const r = parseDatasetFile(readUtf8("wrapped-data.json"), "wrapped-data.json");
    assert(r.ok);
    assert.equal(r.items.length, 3);
  });

  it("normalizes aliases.json", () => {
    const r = parseDatasetFile(readUtf8("aliases.json"), "aliases.json");
    assert(r.ok);
    assert.equal(r.items.length, 2);
    assert.equal(r.items[0]!.input, "p1");
    assert.equal(r.items[0]!.expected_output, "a1");
    assert.equal(r.items[1]!.input, "q2");
    assert.equal(r.items[1]!.expected_output, "r2");
  });

  it("coerces scalars in coercion.json", () => {
    const r = parseDatasetFile(readUtf8("coercion.json"), "coercion.json");
    assert(r.ok);
    assert.equal(r.items[0]!.input, "42");
    assert.equal(r.items[0]!.expected_output, "true");
    assert.equal(r.items[1]!.input, "false");
    assert.equal(r.items[1]!.expected_output, "0");
  });

  it("drops empty inputs in empty-rows.json", () => {
    const r = parseDatasetFile(readUtf8("empty-rows.json"), "empty-rows.json");
    assert(r.ok);
    assert.equal(r.items.length, 1);
    assert.equal(r.items[0]!.input, "keep");
    assert.equal(r.droppedEmpty, 2);
  });

  it("strips UTF-8 BOM in with-bom.json", () => {
    const decoded = decodeDatasetFileToUtf8Text(fixture("with-bom.json"));
    assert(decoded.ok);
    const r = parseDatasetFile(decoded.text, "with-bom.json");
    assert(r.ok);
    assert.equal(r.items.length, 1);
    assert.equal(r.items[0]!.input, "bom");
  });

  it("parses lines.jsonl", () => {
    const r = parseDatasetFile(readUtf8("lines.jsonl"), "lines.jsonl");
    assert(r.ok);
    assert.equal(r.items.length, 3);
    assert.equal(r.items[2]!.input, "j3");
  });

  it("parses mixed-newlines.jsonl with CRLF between lines", () => {
    const r = parseDatasetFile(
      readUtf8("mixed-newlines.jsonl"),
      "mixed-newlines.jsonl",
    );
    assert(r.ok);
    assert.equal(r.items.length, 2);
  });

  it("rejects invalid-shape.json", () => {
    const r = parseDatasetFile(readUtf8("invalid-shape.json"), "invalid-shape.json");
    assert(!r.ok);
    assert.ok(
      r.error.includes("items") ||
        r.error.includes("dataset") ||
        r.error.includes("data"),
    );
  });

  it("rejects invalid-trailing-comma.json", () => {
    const r = parseDatasetFile(
      readUtf8("invalid-trailing-comma.json"),
      "invalid-trailing-comma.json",
    );
    assert(!r.ok);
    assert.equal(r.error, "Could not parse file as JSON or JSONL.");
  });

  it("rejects too-large.json", () => {
    const r = parseDatasetFile(readUtf8("too-large.json"), "too-large.json");
    assert(!r.ok);
    assert.equal(r.error, "Too many rows: 201. Max 200.");
  });

  it("rejects nested-field.json", () => {
    const r = parseDatasetFile(readUtf8("nested-field.json"), "nested-field.json");
    assert(!r.ok);
    assert.equal(
      r.error,
      "Row 1: 'expected_output' must be a string, number, boolean, or null.",
    );
  });

  it("rejects utf16.json via decodeDatasetFileToUtf8Text", () => {
    const d = decodeDatasetFileToUtf8Text(fixture("utf16.json"));
    assert(!d.ok);
    assert.equal(d.error, "File must be UTF-8 encoded.");
  });

  it("reports Line 2 for bad-second-line.jsonl", () => {
    const r = parseDatasetFile(
      readUtf8("bad-second-line.jsonl"),
      "bad-second-line.jsonl",
    );
    assert(!r.ok);
    assert.equal(r.error, "Line 2: invalid JSON.");
  });

  it("rejects empty top-level array", () => {
    const r = parseDatasetFile("[]", "empty.json");
    assert(!r.ok);
    assert.equal(r.error, "Dataset file contains no rows.");
  });

  it("collapses consecutive duplicate rows", () => {
    const r = parseDatasetFile(
      '[{"input":"a","expected_output":"b"},{"input":"a","expected_output":"b"}]',
      "dup.json",
    );
    assert(r.ok);
    assert.equal(r.items.length, 1);
    assert.equal(r.duplicatesCollapsed, 1);
    assert.ok(r.warnings.some((w) => w.includes("Collapsed 1")));
  });

  it("rejects field longer than 8 KiB", () => {
    const long = "x".repeat(DATASET_MAX_FIELD_BYTES + 1);
    const r = parseDatasetFile(
      JSON.stringify([{ input: long, expected_output: "ok" }]),
      "long.json",
    );
    assert(!r.ok);
    assert.equal(r.error, "Row 1: field exceeds 8 KiB.");
  });

  it("warns when expected_output is empty", () => {
    const r = parseDatasetFile(
      '[{"input":"only","expected_output":""}]',
      "ref.json",
    );
    assert(r.ok);
    assert.ok(
      r.warnings.some((w) =>
        w.includes("empty reference output"),
      ),
    );
  });

  it("parses tool-call-valid.json", () => {
    const r = parseDatasetFile(readUtf8("tool-call-valid.json"), "tool-call-valid.json");
    assert(r.ok);
    assert.equal(r.items.length, 2);
    const first = r.items[0]!;
    assert.equal(first.kind, "tool_call");
    if (first.kind === "tool_call") {
      assert.equal(first.tools[0]!.function.name, "get_weather");
      assert.equal(first.expected_tool_calls[0]!.name, "get_weather");
      assert.equal(first.expected_tool_calls[0]!.arguments.city, "Paris");
    }
  });

  it("parses tool-call-valid.jsonl", () => {
    const r = parseDatasetFile(
      readUtf8("tool-call-valid.jsonl"),
      "tool-call-valid.jsonl",
    );
    assert(r.ok);
    assert.equal(r.items.length, 2);
    assert.equal(r.items[0]!.kind, "tool_call");
  });

  it("rejects tool-call-missing-tools.json", () => {
    const r = parseDatasetFile(
      readUtf8("tool-call-missing-tools.json"),
      "tool-call-missing-tools.json",
    );
    assert(!r.ok);
    assert.ok(r.error.includes("missing required 'tools'"));
  });

  it("rejects tool-call-bad-expected.json", () => {
    const r = parseDatasetFile(
      readUtf8("tool-call-bad-expected.json"),
      "tool-call-bad-expected.json",
    );
    assert(!r.ok);
    assert.equal(
      r.error,
      "Row 1: 'expected_tool_calls' must be an array.",
    );
  });

  it("rejects tool-call-oversize-tools.json", () => {
    const r = parseDatasetFile(
      readUtf8("tool-call-oversize-tools.json"),
      "tool-call-oversize-tools.json",
    );
    assert(!r.ok);
    assert.equal(r.error, "Row 1: 'tools' JSON exceeds 8 KiB.");
  });

  it("rejects tool-call-mixed-kind.json", () => {
    const r = parseDatasetFile(
      readUtf8("tool-call-mixed-kind.json"),
      "tool-call-mixed-kind.json",
    );
    assert(!r.ok);
    assert.ok(r.error.includes("Mixed-kind dataset"));
  });

  it("normalizes expected_calls alias in tool-call-alias-expected-calls.json", () => {
    const r = parseDatasetFile(
      readUtf8("tool-call-alias-expected-calls.json"),
      "tool-call-alias-expected-calls.json",
    );
    assert(r.ok);
    const row = r.items[0]!;
    assert.equal(row.kind, "tool_call");
    if (row.kind === "tool_call") {
      assert.equal(row.expected_tool_calls[0]!.name, "get_weather");
    }
  });
});
