"use client";

import { useMemo, useState } from "react";
import { Win95Input } from "@/components/win95/Input";
import { Win95Select } from "@/components/win95/Select";
import type { OpenRouterModelOption } from "@/types";

type Props = {
  id: string;
  label: string;
  models: OpenRouterModelOption[];
  value: string;
  onChange: (modelId: string) => void;
  disabled?: boolean;
  loading?: boolean;
  error?: string | null;
  placeholder?: string;
};

export function ModelSelector({
  id,
  label,
  models,
  value,
  onChange,
  disabled,
  loading,
  error,
  placeholder = "Select a model…",
}: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return models;
    return models.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q) ||
        (m.provider?.toLowerCase().includes(q) ?? false),
    );
  }, [models, query]);

  const searchId = `${id}-search`;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-win95 text-[12px] font-bold text-black">
        {label}
      </label>
      <Win95Input
        id={searchId}
        type="search"
        placeholder="Filter models by name or provider…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        disabled={disabled || loading}
        aria-label="Filter models"
      />
      <Win95Select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || loading}
      >
        <option value="">{loading ? "Loading models…" : placeholder}</option>
        {filtered.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
            {m.provider ? ` — ${m.provider}` : ""}
          </option>
        ))}
      </Win95Select>
      {!loading && query && filtered.length === 0 ? (
        <p className="text-[12px] text-win95-dark-grey">No models match this filter.</p>
      ) : null}
      {error ? (
        <p className="text-[12px] text-black" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
