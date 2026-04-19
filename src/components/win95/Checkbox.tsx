"use client";

import { type InputHTMLAttributes, forwardRef, type ReactNode } from "react";

export type Win95CheckboxProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  children?: ReactNode;
};

/**
 * Win95 13×13 checkbox: sunken box + checkmark when checked.
 */
export const Win95Checkbox = forwardRef<HTMLInputElement, Win95CheckboxProps>(
  function Win95Checkbox(
    { className = "", disabled, children, ...rest },
    ref,
  ) {
    return (
      <label
        className={`inline-flex cursor-pointer items-center gap-1.5 font-win95 text-[12px] leading-[11px] text-black select-none ${
          disabled ? "cursor-not-allowed opacity-70" : ""
        } ${className}`}
      >
        <span className="relative inline-flex h-[15px] w-[15px] shrink-0 items-center justify-center bg-win95-input shadow-[inset_-1px_-1px_0_0_#fff,inset_1px_1px_0_0_#000,inset_-2px_-2px_0_0_#dfdfdf,inset_2px_2px_0_0_#7f7f7f]">
          <input
            ref={ref}
            type="checkbox"
            disabled={disabled}
            className="peer absolute h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
            {...rest}
          />
          <svg
            width="13"
            height="13"
            viewBox="0 0 11 11"
            className="pointer-events-none hidden peer-checked:block"
            aria-hidden
          >
            <path
              d="M1 6 L4 9 L10 1"
              fill="none"
              stroke="#000"
              strokeWidth="1.5"
              strokeLinecap="square"
            />
          </svg>
        </span>
        {children ? <span>{children}</span> : null}
      </label>
    );
  },
);
