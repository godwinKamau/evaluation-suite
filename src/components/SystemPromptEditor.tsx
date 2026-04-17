"use client";

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
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-[#e7e9ea]">
        {label}
      </label>
      {hint ? <p className="text-xs text-[#71767b]">{hint}</p> : null}
      <textarea
        id={id}
        rows={rows}
        className="resize-y rounded-lg border border-[#2f3336] bg-[#16181c] px-3 py-2 font-mono text-sm leading-relaxed text-[#e7e9ea] outline-none focus:border-[#1d9bf0] disabled:opacity-50"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        spellCheck={false}
      />
    </div>
  );
}
