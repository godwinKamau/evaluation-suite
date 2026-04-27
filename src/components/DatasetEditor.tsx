"use client";

import { ToolCallRowEditor } from "@/components/ToolCallRowEditor";
import { Win95Button } from "@/components/win95/Button";
import { Win95Textarea } from "@/components/win95/Input";
import { DEFAULT_EDITOR_TOOL_CATALOG } from "@/lib/tool-call-default-catalog";
import { isToolCallItem, type EvalItem, type ToolCallEvalItem } from "@/types";

type Props = {
  items: EvalItem[];
  onChange: (items: EvalItem[]) => void;
  disabled?: boolean;
  templateKind?: "text" | "tool_call";
};

function emptyTextRow(): EvalItem {
  return { kind: "text", input: "", expected_output: "" };
}

function emptyToolRow(): ToolCallEvalItem {
  return {
    kind: "tool_call",
    input: "",
    tools: DEFAULT_EDITOR_TOOL_CATALOG,
    expected_tool_calls: [],
    expected_output: "(no tool)",
  };
}

export function DatasetEditor({
  items,
  onChange,
  disabled,
  templateKind = "text",
}: Props) {
  const updateRow = (index: number, patch: Partial<EvalItem>) => {
    const next = items.map((row, i) =>
      i === index ? ({ ...row, ...patch } as EvalItem) : row,
    );
    onChange(next);
  };

  const replaceRow = (index: number, row: EvalItem) => {
    const next = items.map((r, i) => (i === index ? row : r));
    onChange(next);
  };

  const removeRow = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const addRow = () => {
    const row = templateKind === "tool_call" ? emptyToolRow() : emptyTextRow();
    onChange([row, ...items]);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-win95 text-[12px] font-bold text-black">
          Test input dataset
        </span>
        <Win95Button
          type="button"
          onClick={addRow}
          disabled={disabled}
        >
          Add row
        </Win95Button>
      </div>
      <p className="text-[12px] text-win95-dark-grey">
        {templateKind === "tool_call"
          ? "Each row is one user message. The model must emit tool calls matching expected_tool_calls; scoring is deterministic (no LLM judge)."
          : "Each row is one user message to the test model. Reference / ideal response is used by the judge for scoring."}
      </p>
      <ul className="flex flex-col gap-3.5">
        {items.map((row, index) => (
          <li
            key={index}
            className="win95-sunken flex flex-col gap-2 bg-white p-2.5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-win95 text-[12px] font-bold text-black">
                Row {index + 1}
              </span>
              <Win95Button
                type="button"
                onClick={() => removeRow(index)}
                disabled={disabled || items.length <= 1}
              >
                Remove
              </Win95Button>
            </div>
            {isToolCallItem(row) ? (
              <ToolCallRowEditor
                row={row}
                index={index}
                onChange={(next) => replaceRow(index, next)}
                disabled={disabled}
              />
            ) : (
              <>
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor={`dataset-input-${index}`}
                    className="font-win95 text-[11px] font-bold text-black"
                  >
                    User prompt (input)
                  </label>
                  <Win95Textarea
                    id={`dataset-input-${index}`}
                    rows={3}
                    value={row.input}
                    onChange={(e) => updateRow(index, { input: e.target.value })}
                    disabled={disabled}
                    spellCheck={false}
                    className="font-mono text-[12px]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor={`dataset-expected-${index}`}
                    className="font-win95 text-[11px] font-bold text-black"
                  >
                    Reference / ideal output
                  </label>
                  <Win95Textarea
                    id={`dataset-expected-${index}`}
                    rows={3}
                    value={row.expected_output}
                    onChange={(e) =>
                      updateRow(index, { expected_output: e.target.value })
                    }
                    disabled={disabled}
                    spellCheck={false}
                    className="font-mono text-[12px]"
                  />
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
