"use client";

import { Win95Textarea } from "@/components/win95/Input";

type Props = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  rows?: number;
  hint?: string;
};

export function SystemPromptEditor({
  id,
  label,
  value,
  onChange,
  disabled,
  rows = 5,
  hint,
}: Props) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-win95 text-[11px] font-bold text-black">
        {label}
      </label>
      {hint ? <p className="text-[11px] text-win95-dark-grey">{hint}</p> : null}
      <Win95Textarea
        id={id}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        spellCheck={false}
        className="font-mono"
      />
    </div>
  );
}
