"use client";

import type { EvalItem } from "@/types";
import { Win95Button } from "@/components/win95/Button";
import { Win95Textarea } from "@/components/win95/Input";

type Props = {
  items: EvalItem[];
  onChange: (items: EvalItem[]) => void;
  disabled?: boolean;
};

function emptyRow(): EvalItem {
  return { input: "", expected_output: "" };
}

export function DatasetEditor({ items, onChange, disabled }: Props) {
  const updateRow = (index: number, patch: Partial<EvalItem>) => {
    const next = items.map((row, i) =>
      i === index ? { ...row, ...patch } : row,
    );
    onChange(next);
  };

  const removeRow = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const addRow = () => {
    onChange([emptyRow(), ...items]);
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
        Each row is one user message to the test model. Reference / ideal
        response is used by the judge for scoring.
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
          </li>
        ))}
      </ul>
    </div>
  );
}
