"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ExpectedToolCall, ToolCallEvalItem } from "@/types";
import { Win95Input, Win95Textarea } from "@/components/win95/Input";

function summarizeExpectedToolCalls(expected: ExpectedToolCall[]): string {
  if (expected.length === 0) return "(no tool)";
  return `[tool_call] ${expected.map((c) => c.name).join(", ")}`;
}

type Props = {
  row: ToolCallEvalItem;
  index: number;
  onChange: (next: ToolCallEvalItem) => void;
  disabled?: boolean;
};

export function ToolCallRowEditor({ row, index, onChange, disabled }: Props) {
  const toolsPretty = useMemo(
    () => JSON.stringify(row.tools, null, 2),
    [row.tools],
  );
  const expectedCallsPretty = useMemo(
    () => JSON.stringify(row.expected_tool_calls, null, 2),
    [row.expected_tool_calls],
  );

  const [expectedJson, setExpectedJson] = useState(expectedCallsPretty);
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    setExpectedJson(expectedCallsPretty);
    setJsonError(null);
  }, [expectedCallsPretty]);

  const commitExpectedJson = useCallback(
    (text: string) => {
      setExpectedJson(text);
      try {
        const parsed = JSON.parse(text) as unknown;
        if (!Array.isArray(parsed)) {
          setJsonError("expected_tool_calls must be a JSON array.");
          return;
        }
        const calls: ExpectedToolCall[] = [];
        for (let i = 0; i < parsed.length; i++) {
          const item = parsed[i];
          if (!item || typeof item !== "object" || Array.isArray(item)) {
            setJsonError(`expected_tool_calls[${i}] must be an object.`);
            return;
          }
          const o = item as Record<string, unknown>;
          if (typeof o.name !== "string" || !o.name.trim()) {
            setJsonError(`expected_tool_calls[${i}].name must be a non-empty string.`);
            return;
          }
          if (
            !o.arguments ||
            typeof o.arguments !== "object" ||
            Array.isArray(o.arguments)
          ) {
            setJsonError(
              `expected_tool_calls[${i}].arguments must be a JSON object.`,
            );
            return;
          }
          calls.push({
            name: o.name.trim(),
            arguments: o.arguments as Record<string, unknown>,
          });
        }
        setJsonError(null);
        onChange({
          ...row,
          expected_tool_calls: calls,
          expected_output: summarizeExpectedToolCalls(calls),
        });
      } catch {
        setJsonError("Invalid JSON.");
      }
    },
    [onChange, row],
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        <label
          htmlFor={`tool-input-${index}`}
          className="font-win95 text-[11px] font-bold text-black"
        >
          User prompt (input)
        </label>
        <Win95Textarea
          id={`tool-input-${index}`}
          rows={3}
          value={row.input}
          onChange={(e) => onChange({ ...row, input: e.target.value })}
          disabled={disabled}
          spellCheck={false}
          className="font-mono text-[12px]"
        />
      </div>

      <div className="flex flex-col gap-1">
        <span className="font-win95 text-[11px] font-bold text-black">
          Tool catalog (read-only)
        </span>
        <pre className="win95-sunken max-h-40 overflow-auto whitespace-pre-wrap bg-white p-2 font-mono text-[11px] text-black">
          {toolsPretty}
        </pre>
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor={`tool-expected-${index}`}
          className="font-win95 text-[11px] font-bold text-black"
        >
          expected_tool_calls (JSON array)
        </label>
        <Win95Textarea
          id={`tool-expected-${index}`}
          rows={8}
          value={expectedJson}
          onChange={(e) => {
            const next = e.target.value;
            setExpectedJson(next);
            setJsonError(null);
          }}
          onBlur={() => commitExpectedJson(expectedJson)}
          disabled={disabled}
          spellCheck={false}
          className="font-mono text-[12px]"
        />
        {jsonError ? (
          <p className="font-win95 text-[11px] text-black" role="alert">
            {jsonError}
          </p>
        ) : null}
        <p className="text-[11px] text-win95-dark-grey">
          Summary (sent to LangSmith / back-compat):{" "}
          <span className="font-mono text-black">{row.expected_output}</span>
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor={`tool-notes-${index}`}
          className="font-win95 text-[11px] font-bold text-black"
        >
          Notes (optional)
        </label>
        <Win95Input
          id={`tool-notes-${index}`}
          value={row.notes ?? ""}
          onChange={(e) =>
            onChange({
              ...row,
              notes: e.target.value.trim() ? e.target.value : undefined,
            })
          }
          disabled={disabled}
          className="font-mono text-[12px]"
        />
      </div>
    </div>
  );
}
