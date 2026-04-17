"use client";

import {
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
  forwardRef,
} from "react";

const inputClass =
  "w-full min-h-[24px] border-0 bg-win95-input px-1.5 py-1 font-win95 text-[11px] leading-[10px] text-black outline-none " +
  "shadow-[inset_-1px_-1px_0_0_#fff,inset_1px_1px_0_0_#000,inset_-2px_-2px_0_0_#dfdfdf,inset_2px_2px_0_0_#7f7f7f] " +
  "placeholder:text-win95-dark-grey disabled:bg-win95-grey disabled:text-win95-dark-grey";

export type Win95InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Win95Input = forwardRef<HTMLInputElement, Win95InputProps>(
  function Win95Input({ className = "", ...rest }, ref) {
    return (
      <input ref={ref} className={`${inputClass} ${className}`} {...rest} />
    );
  },
);

export type Win95TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Win95Textarea = forwardRef<HTMLTextAreaElement, Win95TextareaProps>(
  function Win95Textarea({ className = "", rows = 5, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        rows={rows}
        className={`resize-y ${inputClass} ${className}`}
        {...rest}
      />
    );
  },
);
