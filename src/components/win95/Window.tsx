"use client";

import type { ReactNode } from "react";

type Props = {
  title: string;
  children: ReactNode;
  className?: string;
};

/** Minimize / maximize / close glyphs (decorative, non-functional) */
function TitleBarControls() {
  return (
    <div className="flex items-center gap-0.5 pr-0.5">
      <span
        className="flex h-[14px] w-[14px] items-center justify-center bg-win95-grey text-[9px] leading-none text-black shadow-[inset_-1px_-1px_0_0_#000,inset_1px_1px_0_0_#fff,inset_-2px_-2px_0_0_#7f7f7f,inset_2px_2px_0_0_#dfdfdf]"
        aria-hidden
      >
        _
      </span>
      <span
        className="flex h-[14px] w-[14px] items-center justify-center bg-win95-grey text-[8px] leading-none text-black shadow-[inset_-1px_-1px_0_0_#000,inset_1px_1px_0_0_#fff,inset_-2px_-2px_0_0_#7f7f7f,inset_2px_2px_0_0_#dfdfdf]"
        aria-hidden
      >
        □
      </span>
      <span
        className="flex h-[14px] w-[14px] items-center justify-center bg-win95-grey text-[9px] font-bold leading-none text-black shadow-[inset_-1px_-1px_0_0_#000,inset_1px_1px_0_0_#fff,inset_-2px_-2px_0_0_#7f7f7f,inset_2px_2px_0_0_#dfdfdf]"
        aria-hidden
      >
        ×
      </span>
    </div>
  );
}

/**
 * Classic Win95 window: navy title bar + grey client area with raised outer frame.
 */
export function Win95Window({ title, children, className = "" }: Props) {
  return (
    <div
      className={`mx-auto w-full max-w-6xl overflow-hidden bg-win95-grey font-win95 text-[11px] leading-[10px] text-black shadow-[inset_-1px_-1px_0_0_#000,inset_1px_1px_0_0_#fff,inset_-2px_-2px_0_0_#7f7f7f,inset_2px_2px_0_0_#dfdfdf] ${className}`}
    >
      <div className="flex h-[18px] min-h-[18px] items-center justify-between bg-win95-navy pl-1 pr-0.5 text-white">
        <div className="flex min-w-0 flex-1 items-center gap-1 pl-0.5">
          <span className="h-3 w-3 shrink-0 bg-win95-grey shadow-[inset_-1px_-1px_0_0_#000,inset_1px_1px_0_0_#fff]" />
          <span className="truncate font-bold">{title}</span>
        </div>
        <TitleBarControls />
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}
