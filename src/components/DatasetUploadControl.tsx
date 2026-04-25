"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Win95Button } from "@/components/win95/Button";
import { Win95Input } from "@/components/win95/Input";
import {
  DATASET_MAX_FILE_BYTES,
  decodeDatasetFileToUtf8Text,
  parseDatasetFile,
  type ParseResult,
} from "@/lib/dataset-parse";
import type { EvalItem } from "@/types";

const ACCEPT = ".json,.jsonl,application/json";

type Props = {
  /** When this value changes, pending preview / errors are cleared (e.g. template selection). */
  resetKey: string;
  disabled?: boolean;
  onLoad: (items: EvalItem[], mode: "replace" | "append") => void;
};

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

export function DatasetUploadControl({
  resetKey,
  disabled,
  onLoad,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [fileWarning, setFileWarning] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Extract<
    ParseResult,
    { ok: true }
  > | null>(null);

  const clearAll = useCallback(() => {
    setFileName("");
    setFileWarning(null);
    setParseError(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }, []);

  useEffect(() => {
    clearAll();
  }, [resetKey, clearAll]);

  const processFile = useCallback(
    async (file: File, multiFileWarning?: string | null) => {
      setFileWarning(multiFileWarning ?? null);
      setParseError(null);
      setPreview(null);
      setFileName(file.name);

      if (file.size > DATASET_MAX_FILE_BYTES) {
        setParseError("File too large. Max 1 MiB.");
        return;
      }

      const buf = await file.arrayBuffer();
      const decoded = decodeDatasetFileToUtf8Text(buf);
      if (!decoded.ok) {
        setParseError(decoded.error);
        return;
      }

      const result = parseDatasetFile(decoded.text, file.name);
      if (!result.ok) {
        setParseError(result.error);
        return;
      }

      setPreview({
        ...result,
        warnings: [
          ...(multiFileWarning ? [multiFileWarning] : []),
          ...result.warnings,
        ],
      });
    },
    [],
  );

  const onPickFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const list = e.target.files;
      if (!list?.length) return;
      await processFile(list[0]!);
    },
    [processFile],
  );

  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;
      const files = e.dataTransfer.files;
      if (!files.length) return;
      const multi =
        files.length > 1
          ? "Multiple files dropped — only the first will be used."
          : null;
      await processFile(files[0]!, multi);
    },
    [disabled, processFile],
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onCommit = (mode: "replace" | "append") => {
    if (!preview) return;
    onLoad(preview.items, mode);
    clearAll();
  };

  const onCancel = () => {
    clearAll();
  };

  const dropZoneClass = [
    "win95-sunken flex flex-col items-center justify-center gap-2 border border-dotted border-win95-dark-grey bg-white p-4",
    disabled ? "pointer-events-none opacity-60" : "",
  ].join(" ");

  return (
    <div className="flex flex-col gap-2">
      <span className="font-win95 text-[12px] font-bold text-black">
        Load dataset from file
      </span>
      <p className="text-[12px] text-win95-dark-grey">
        .json array, wrapped object (items / dataset / data / examples / rows),
        or .jsonl (one JSON object per line). Max 1 MiB, 200 rows, 8 KiB per
        field.
      </p>

      {fileName ? (
        <div className="flex flex-col gap-1">
          <label
            htmlFor="dataset-upload-filename"
            className="font-win95 text-[11px] font-bold text-black"
          >
            Selected file
          </label>
          <Win95Input
            id="dataset-upload-filename"
            readOnly
            value={fileName}
            aria-readonly="true"
          />
        </div>
      ) : null}

      <div
        className={dropZoneClass}
        onDragOver={onDragOver}
        onDrop={onDrop}
        role="region"
        aria-label="Drop zone for JSON or JSONL dataset file"
      >
        <p className="text-center font-win95 text-[12px] text-black">
          Drop a .json or .jsonl file here, or
        </p>
        <Win95Button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={disabled}
        >
          Load JSON…
        </Win95Button>
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          aria-hidden
          tabIndex={-1}
          disabled={disabled}
          onChange={onPickFile}
        />
      </div>

      {fileWarning && !preview ? (
        <p className="font-win95 text-[12px] text-black">{fileWarning}</p>
      ) : null}

      {parseError ? (
        <p
          className="win95-sunken bg-white p-2 font-win95 text-[12px] text-black"
          role="alert"
        >
          {parseError}
        </p>
      ) : null}

      {preview ? (
        <div className="flex flex-col gap-2">
          <p className="font-win95 text-[12px] font-bold text-black">
            {preview.successSummary}
          </p>
          {preview.warnings.length > 0 ? (
            <ul className="list-inside list-disc font-win95 text-[12px] text-black">
              {preview.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          ) : null}
          <details className="flex flex-col gap-1">
            <summary className="cursor-pointer font-win95 text-[12px] font-bold text-black">
              Preview first {Math.min(5, preview.items.length)} of{" "}
              {preview.items.length} row(s)
            </summary>
            <ol className="mt-2 flex list-decimal flex-col gap-2 pl-5 font-win95 text-[12px] text-black">
              {preview.items.slice(0, 5).map((row, i) => (
                <li key={i} className="win95-sunken bg-white p-2">
                  <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-snug text-black">
                    {truncate(row.input, 120)}
                  </pre>
                </li>
              ))}
            </ol>
          </details>
          <div className="flex flex-wrap gap-2">
            <Win95Button
              type="button"
              variant="preferred"
              disabled={disabled}
              onClick={() => onCommit("replace")}
            >
              Replace current rows
            </Win95Button>
            <Win95Button
              type="button"
              disabled={disabled}
              onClick={() => onCommit("append")}
            >
              Append to current rows
            </Win95Button>
            <Win95Button type="button" disabled={disabled} onClick={onCancel}>
              Cancel
            </Win95Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
