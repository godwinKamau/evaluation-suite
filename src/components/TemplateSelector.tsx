"use client";

import { Win95Select } from "@/components/win95/Select";
import { BUSINESS_TEMPLATES } from "@/lib/business-templates";
import type { TemplateKey } from "@/types";

export type TemplateSelection = "custom" | TemplateKey;

type Props = {
  id?: string;
  value: TemplateSelection;
  onChange: (value: TemplateSelection) => void;
  disabled?: boolean;
};

const TEMPLATE_ENTRIES = Object.entries(BUSINESS_TEMPLATES) as [
  TemplateKey,
  (typeof BUSINESS_TEMPLATES)[TemplateKey],
][];

export function TemplateSelector({
  id = "business-template",
  value,
  onChange,
  disabled,
}: Props) {
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        className="font-win95 text-[12px] font-bold text-black"
      >
        Business template
      </label>
      <p className="text-[12px] text-win95-dark-grey">
        Choose a profile to load a base system prompt and sample prompts, or
        Custom to use your own.
      </p>
      <Win95Select
        id={id}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value as TemplateSelection)}
      >
        <option value="custom">Custom (default dataset)</option>
        {TEMPLATE_ENTRIES.map(([key, { label }]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </Win95Select>
    </div>
  );
}
