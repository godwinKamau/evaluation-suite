"use client";

import { type ButtonHTMLAttributes, forwardRef } from "react";

export type Win95ButtonVariant = "default" | "preferred";

/** Default + active:pressed — keep literals so Tailwind JIT emits both utilities */
const RAISED_AND_PRESSED =
  "shadow-[inset_-1px_-1px_0_0_#000,inset_1px_1px_0_0_#fff,inset_-2px_-2px_0_0_#7f7f7f,inset_2px_2px_0_0_#dfdfdf] active:shadow-[inset_-1px_-1px_0_0_#fff,inset_1px_1px_0_0_#000,inset_-2px_-2px_0_0_#c4c4c4,inset_2px_2px_0_0_#808080]";
const PREFERRED =
  "shadow-[inset_-1px_-1px_0_0_#000,inset_1px_1px_0_0_#000,inset_-2px_-2px_0_0_#000,inset_2px_2px_0_0_#fff,inset_-3px_-3px_0_0_#7f7f7f,inset_3px_3px_0_0_#dfdfdf] active:shadow-[inset_-1px_-1px_0_0_#fff,inset_1px_1px_0_0_#000,inset_-2px_-2px_0_0_#c4c4c4,inset_2px_2px_0_0_#808080]";
const RAISED_ONLY =
  "shadow-[inset_-1px_-1px_0_0_#000,inset_1px_1px_0_0_#fff,inset_-2px_-2px_0_0_#7f7f7f,inset_2px_2px_0_0_#dfdfdf]";

export type Win95ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Win95ButtonVariant;
};

/**
 * Windows 95–style push button with authentic multi-layer bevel.
 */
export const Win95Button = forwardRef<HTMLButtonElement, Win95ButtonProps>(
  function Win95Button(
    { className = "", variant = "default", disabled, children, type, ...rest },
    ref,
  ) {
    const bevelClass =
      disabled || variant === "preferred"
        ? variant === "preferred" && !disabled
          ? PREFERRED
          : RAISED_ONLY
        : RAISED_AND_PRESSED;

    return (
      <button
        ref={ref}
        type={type ?? "button"}
        disabled={disabled}
        className={[
          "group relative inline-flex min-h-[28px] min-w-[85px] items-center justify-center bg-win95-grey px-[18px] py-2",
          "font-win95 text-[12px] leading-[11px] text-black outline-none",
          "select-none disabled:text-win95-dark-grey disabled:[text-shadow:1px_1px_0_#fff]",
          "enabled:active:translate-x-px enabled:active:translate-y-px",
          bevelClass,
          "focus-visible:outline-none",
          className,
        ].join(" ")}
        {...rest}
      >
        {/* Dotted focus ring (Win95 keyboard focus) */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-[4px_5px_5px_5px] z-[2] border border-dotted border-black opacity-0 group-focus-visible:opacity-100"
        />
        <span className="relative z-[1] whitespace-nowrap">{children}</span>
      </button>
    );
  },
);
