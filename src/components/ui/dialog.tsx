"use client";

import { X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import type { ReactNode } from "react";

const WIDTHS = { sm: "max-w-md", md: "max-w-2xl", lg: "max-w-4xl" } as const;

/**
 * A modal dialog (Radix: focus trap, Escape to close, labelled by its title).
 * Rendered when `open`; `onClose` runs on Escape, the overlay or the close button.
 */
export function Dialog({
  open,
  onClose,
  title,
  eyebrow,
  width = "md",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  width?: keyof typeof WIDTHS;
  children: ReactNode;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/40" />
        <DialogPrimitive.Content
          className={`fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-line bg-panel p-5 font-sans text-sm shadow-xl sm:p-6 ${WIDTHS[width]}`}
          aria-describedby={undefined}
        >
          <div className="flex items-start justify-between gap-4 border-b border-line pb-3">
            <div>
              {eyebrow && <p className="text-xs font-medium text-muted">{eyebrow}</p>}
              <DialogPrimitive.Title className="mt-0.5 font-sans text-lg font-semibold tracking-tight text-ink">{title}</DialogPrimitive.Title>
            </div>
            <DialogPrimitive.Close className="flex size-10 shrink-0 items-center justify-center rounded-md text-muted hover:bg-paper hover:text-ink" aria-label="Close">
              <X size={18} />
            </DialogPrimitive.Close>
          </div>
          <div className="mt-4">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
