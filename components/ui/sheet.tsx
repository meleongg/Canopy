"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

export function SheetContent({
  className,
  children,
  side = "right",
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  side?: "left" | "right" | "bottom";
}) {
  const showMobileHandle = side === "right" || side === "bottom";

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/45" />
      <DialogPrimitive.Content
        className={cn(
          "fixed z-50 overflow-y-auto [scrollbar-gutter:stable] border-border bg-card p-5",
          side === "bottom" &&
            "inset-x-0 bottom-0 max-h-[min(92dvh,100%)] w-full rounded-t-2xl border-t",
          side === "right" &&
            "inset-x-0 bottom-0 max-h-[min(92dvh,100%)] w-full rounded-t-2xl border-t md:inset-x-auto md:bottom-auto md:top-0 md:right-0 md:h-full md:max-h-none md:w-[min(520px,calc(100%-2rem))] md:rounded-none md:border-t-0 md:border-l",
          side === "left" &&
            "top-0 left-0 h-full w-[min(520px,calc(100%-2rem))] border-r",
          className,
        )}
        {...props}
      >
        {showMobileHandle ? (
          <div
            aria-hidden
            className={cn(
              "mx-auto mb-4 h-1.5 w-10 shrink-0 rounded-full bg-border",
              side === "right" && "md:hidden",
            )}
          />
        ) : null}
        {children}
        <DialogPrimitive.Close
          className={cn(
            "absolute right-4 inline-flex size-8 cursor-pointer items-center justify-center rounded-lg border border-border hover:bg-primary hover:text-primary-foreground",
            showMobileHandle ? "top-3 md:top-4" : "top-4",
          )}
        >
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function SheetHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div className={cn("space-y-1 pr-10", className)} {...props} />;
}

export function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn("font-serif text-2xl font-bold", className)}
      {...props}
    />
  );
}

export function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn("text-sm leading-6 text-muted-foreground", className)}
      {...props}
    />
  );
}
