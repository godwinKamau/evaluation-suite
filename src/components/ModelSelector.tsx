"use client";

import { useMemo, useState } from "react";
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
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-[#e7e9ea]">
        {label}
      </label>
      <input
        id={searchId}
        type="search"
        placeholder="Filter models by name or provider…"
        className="rounded-lg border border-[#2f3336] bg-[#0f1419] px-3 py-1.5 text-sm text-[#e7e9ea] outline-none placeholder:text-[#71767b] focus:border-[#1d9bf0] disabled:opacity-50"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        disabled={disabled || loading}
        aria-label="Filter models"
      />
      <select
        id={id}
        className="rounded-lg border border-[#2f3336] bg-[#16181c] px-3 py-2 text-sm text-[#e7e9ea] outline-none focus:border-[#1d9bf0] disabled:opacity-50"
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
      </select>
      {!loading && query && filtered.length === 0 ? (
        <p className="text-xs text-[#71767b]">No models match this filter.</p>
      ) : null}
      {error ? (
        <p className="text-xs text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
