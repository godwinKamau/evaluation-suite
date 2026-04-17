"use client";

import { type SelectHTMLAttributes, forwardRef, useRef } from "react";

export type Win95SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

const selectShell =
  "flex min-h-[24px] w-full items-stretch bg-win95-input " +
  "shadow-[inset_-1px_-1px_0_0_#fff,inset_1px_1px_0_0_#000,inset_-2px_-2px_0_0_#dfdfdf,inset_2px_2px_0_0_#7f7f7f]";

const selectField =
  "min-h-[24px] min-w-0 flex-1 cursor-pointer border-0 bg-transparent px-1.5 py-1 font-win95 text-[11px] leading-[10px] text-black outline-none " +
  "appearance-none disabled:cursor-not-allowed disabled:bg-win95-grey disabled:text-win95-dark-grey";

/** Win95 dropdown arrow button (decorative; click focuses/opens native select) */
function DropdownGlyph({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-hidden
      onClick={onClick}
      className={
        "flex h-full w-[18px] shrink-0 items-center justify-center bg-win95-grey " +
        "shadow-[inset_-1px_-1px_0_0_#000,inset_1px_1px_0_0_#fff,inset_-2px_-2px_0_0_#7f7f7f,inset_2px_2px_0_0_#dfdfdf] " +
        "active:shadow-[inset_-1px_-1px_0_0_#fff,inset_1px_1px_0_0_#000,inset_-2px_-2px_0_0_#c4c4c4,inset_2px_2px_0_0_#808080]"
      }
    >
      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
        <path d="M1 3h8L5 8z" fill="#000" />
      </svg>
    </button>
  );
}

export const Win95Select = forwardRef<HTMLSelectElement, Win95SelectProps>(
  function Win95Select({ className = "", disabled, ...rest }, ref) {
    const innerRef = useRef<HTMLSelectElement | null>(null);

    const setRefs = (el: HTMLSelectElement | null) => {
      innerRef.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) ref.current = el;
    };

    const openSelect = () => {
      innerRef.current?.focus();
      innerRef.current?.dispatchEvent(
        new MouseEvent("mousedown", { bubbles: true }),
      );
    };

    return (
      <div className={`${selectShell} ${className}`}>
        <select
          ref={setRefs}
          disabled={disabled}
          className={selectField}
          {...rest}
        />
        {!disabled ? <DropdownGlyph onClick={openSelect} /> : null}
      </div>
    );
  },
);
